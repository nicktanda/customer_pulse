# frozen_string_literal: true

module Ai
  class StakeholderIdentifier < BaseAnalyzer
    SYSTEM_PROMPT = <<~PROMPT
      You are an expert at identifying stakeholders affected by product insights.
      Analyze the insight and determine which user segments, teams, or groups
      should be engaged or considered.

      For each stakeholder segment:
      1. Create a clear name for the segment
      2. Classify the type: user_segment, internal_team, customer_tier, use_case_group, or geographic_region
      3. Write a description of this stakeholder group
      4. Estimate the size of this segment
      5. Rate engagement priority (0-5, where 5 is critical)
      6. Suggest an engagement strategy
      7. List characteristics that define this segment

      Respond in JSON format:
      {
        "stakeholders": [
          {
            "name": "Segment name",
            "segment_type": "user_segment|internal_team|customer_tier|use_case_group|geographic_region",
            "description": "Who this segment is",
            "size_estimate": 500,
            "engagement_priority": 4,
            "engagement_strategy": "How to engage this group",
            "characteristics": ["Characteristic 1", "Characteristic 2"],
            "impact_level": 3,
            "impact_description": "How this insight affects them"
          }
        ]
      }

      Guidelines:
      - Identify 2-5 relevant stakeholder segments
      - Include both internal teams (engineering, support, sales) and user segments
      - Higher priority for segments most affected by the insight
      - Be specific about engagement strategies
    PROMPT

    def identify(insight)
      result = analyze_insight(insight)

      if result[:error]
        Rails.logger.error("Stakeholder identification failed for insight ##{insight.id}: #{result[:error]}")
        return { stakeholders: [], created: 0, error: result[:error] }
      end

      created = create_stakeholders_from_result(result, insight)

      { stakeholders: created, created: created.count }
    end

    def identify_batch(insights)
      all_stakeholders = []

      insights.each do |insight|
        result = identify(insight)
        all_stakeholders.concat(result[:stakeholders]) unless result[:error]
        rate_limit_sleep
      end

      { stakeholders: all_stakeholders.uniq, created: all_stakeholders.count }
    end

    private

    def analyze_insight(insight)
      prompt = build_insight_prompt(insight)
      call_claude(prompt, system_prompt: SYSTEM_PROMPT)
    end

    def build_insight_prompt(insight)
      parts = ["Identify stakeholders for the following insight:\n"]
      parts << "Title: #{insight.title}"
      parts << "Description: #{insight.description}"
      parts << "Type: #{insight.insight_type}"
      parts << "Severity: #{insight.severity}"
      parts << "Affected Users: #{insight.affected_users_count}"

      if insight.feedbacks.any?
        parts << "\nSample Feedback Sources:"
        insight.feedbacks.limit(5).each do |f|
          parts << "- #{f.source}: #{f.author_name || 'Anonymous'}"
        end
      end

      parts.join("\n")
    end

    def create_stakeholders_from_result(result, insight)
      created_stakeholders = []

      stakeholders_data = result[:stakeholders] || []
      stakeholders_data.each do |stakeholder_data|
        stakeholder = find_or_create_stakeholder(stakeholder_data)
        next unless stakeholder

        link_stakeholder_to_insight(stakeholder, insight, stakeholder_data)
        created_stakeholders << stakeholder
      end

      created_stakeholders
    end

    def find_or_create_stakeholder(data)
      existing = StakeholderSegment.find_by("LOWER(name) = ?", data[:name].downcase)
      return update_stakeholder(existing, data) if existing

      StakeholderSegment.create!(
        name: data[:name],
        segment_type: data[:segment_type],
        description: data[:description],
        size_estimate: data[:size_estimate] || 0,
        engagement_priority: data[:engagement_priority] || 0,
        engagement_strategy: data[:engagement_strategy],
        characteristics: data[:characteristics] || []
      )
    rescue ActiveRecord::RecordInvalid => e
      Rails.logger.error("Failed to create stakeholder: #{e.message}")
      nil
    end

    def update_stakeholder(stakeholder, data)
      stakeholder.update!(
        size_estimate: [stakeholder.size_estimate, data[:size_estimate] || 0].max,
        engagement_priority: [stakeholder.engagement_priority, data[:engagement_priority] || 0].max
      )
      stakeholder
    end

    def link_stakeholder_to_insight(stakeholder, insight, data)
      InsightStakeholder.find_or_create_by!(
        insight: insight,
        stakeholder_segment: stakeholder
      ) do |is|
        is.impact_level = data[:impact_level] || 0
        is.impact_description = data[:impact_description]
      end
    end
  end
end
