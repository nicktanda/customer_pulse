# frozen_string_literal: true

module Ai
  class InsightDiscoverer < BaseAnalyzer
    SYSTEM_PROMPT = <<~PROMPT
      You are an expert product analyst discovering insights from customer feedback.
      Analyze the feedback batch and identify distinct issues, problems, opportunities, or patterns.

      For each insight discovered, provide:
      1. A clear, actionable title
      2. A detailed description explaining the insight
      3. The type: problem, opportunity, trend, risk, or user_need
      4. Severity: informational, minor, moderate, major, or critical
      5. Your confidence score (0-100)
      6. Estimated number of affected users based on the feedback
      7. Evidence: quotes or references from the feedback that support this insight
      8. Which feedback items (by index, 0-based) contributed to this insight

      Respond in JSON format:
      {
        "insights": [
          {
            "title": "Clear insight title",
            "description": "Detailed explanation of the insight",
            "insight_type": "problem|opportunity|trend|risk|user_need",
            "severity": "informational|minor|moderate|major|critical",
            "confidence_score": 85,
            "affected_users_estimate": 150,
            "evidence": ["Quote 1 from feedback", "Quote 2"],
            "feedback_indices": [0, 2, 5]
          }
        ]
      }

      Guidelines:
      - Group related feedback into single insights rather than creating duplicates
      - Be specific and actionable in titles and descriptions
      - Higher severity for issues affecting core functionality or many users
      - Include direct quotes as evidence when possible
    PROMPT

    BATCH_SIZE = 25

    def discover(feedbacks)
      return { insights: [], created: 0 } if feedbacks.empty?

      feedback_array = feedbacks.to_a
      all_insights = []

      batch_items(feedback_array, batch_size: BATCH_SIZE).each_with_index do |batch, batch_index|
        batch_offset = batch_index * BATCH_SIZE
        result = analyze_batch(batch, batch_offset, feedback_array)

        if result[:error]
          Rails.logger.error("Insight discovery failed for batch #{batch_index}: #{result[:error]}")
          next
        end

        created = create_insights_from_result(result, batch, batch_offset, feedback_array)
        all_insights.concat(created)

        rate_limit_sleep
      end

      mark_feedbacks_processed(feedback_array)

      { insights: all_insights, created: all_insights.count }
    end

    private

    def analyze_batch(batch, batch_offset, all_feedbacks)
      prompt = build_batch_prompt(batch, batch_offset)
      call_claude(prompt, system_prompt: SYSTEM_PROMPT)
    end

    def build_batch_prompt(batch, batch_offset)
      parts = ["Analyze the following #{batch.count} feedback items:\n"]

      batch.each_with_index do |feedback, index|
        global_index = batch_offset + index
        parts << "--- Feedback ##{global_index} ---"
        parts << "Title: #{feedback.title}" if feedback.title.present?
        parts << "Content: #{feedback.content}"
        parts << "Category: #{feedback.category}"
        parts << "Priority: #{feedback.priority}"
        parts << "Source: #{feedback.source}"
        parts << "Author: #{feedback.author_name}" if feedback.author_name.present?
        parts << ""
      end

      parts.join("\n")
    end

    def create_insights_from_result(result, batch, batch_offset, all_feedbacks)
      created_insights = []

      insights_data = result[:insights] || []
      insights_data.each do |insight_data|
        insight = create_insight(insight_data)
        next unless insight

        link_feedbacks_to_insight(insight, insight_data, batch_offset, all_feedbacks)
        created_insights << insight
      end

      created_insights
    end

    def create_insight(data)
      Insight.create!(
        title: data[:title],
        description: data[:description],
        insight_type: data[:insight_type],
        severity: data[:severity],
        confidence_score: data[:confidence_score] || 0,
        affected_users_count: data[:affected_users_estimate] || 0,
        evidence: data[:evidence] || [],
        pm_persona: @pm_persona,
        status: :discovered,
        discovered_at: Time.current
      )
    rescue ActiveRecord::RecordInvalid => e
      Rails.logger.error("Failed to create insight: #{e.message}")
      nil
    end

    def link_feedbacks_to_insight(insight, data, batch_offset, all_feedbacks)
      indices = data[:feedback_indices] || []
      indices.each do |index|
        feedback = all_feedbacks[index]
        next unless feedback

        FeedbackInsight.find_or_create_by!(
          feedback: feedback,
          insight: insight
        ) do |fi|
          fi.relevance_score = calculate_relevance(data, index, indices)
        end
      end

      insight.update_feedback_count!
    end

    def calculate_relevance(data, index, all_indices)
      return 1.0 if all_indices.count == 1
      (1.0 - (all_indices.index(index).to_f / all_indices.count)).round(2)
    end

    def mark_feedbacks_processed(feedbacks)
      feedback_ids = feedbacks.map(&:id)
      Feedback.where(id: feedback_ids).update_all(insight_processed_at: Time.current)
    end
  end
end
