module Ai
  class FeedbackProcessor
    SYSTEM_PROMPT = <<~PROMPT
      You are an AI assistant that analyzes customer feedback. For each feedback item, you must:
      1. Categorize it as one of: bug, feature_request, complaint, or uncategorized
      2. Assign a priority: p1 (critical/urgent), p2 (high), p3 (medium), p4 (low)
      3. Provide a brief 1-2 sentence summary
      4. Rate your confidence from 0.0 to 1.0

      Respond in JSON format only:
      {
        "category": "bug|feature_request|complaint|uncategorized",
        "priority": "p1|p2|p3|p4",
        "summary": "Brief summary here",
        "confidence": 0.85
      }

      Priority Guidelines:
      - P1: System down, security issues, data loss, blocking many users
      - P2: Major functionality broken, significant user impact
      - P3: Minor bugs, usability issues, non-critical features
      - P4: Nice-to-haves, minor improvements, cosmetic issues
    PROMPT

    def initialize(project: nil, include_objectives: true)
      api_key = Integration.anthropic_api_key(project: project)
      @client = Anthropic::Client.new(api_key: api_key)
      @project = project
      @include_objectives = include_objectives
    end

    def process(feedback, objectives: nil)
      return if feedback.ai_processed_at.present? && !feedback.manually_reviewed

      prompt = build_prompt(feedback)

      begin
        response = @client.messages.create(
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          system: SYSTEM_PROMPT,
          messages: [ { role: "user", content: prompt } ]
        )

        result = parse_response(response)

        # Optionally analyze objective alignment
        alignment_result = nil
        if @include_objectives
          objectives ||= load_active_objectives(feedback)
          if objectives.any?
            alignment_result = analyze_objective_alignment(feedback, objectives)
          end
        end

        update_feedback(feedback, result, alignment_result)

        { success: true, result: result, alignment: alignment_result }
      rescue => e
        handle_error(feedback, e)
        { success: false, error: e.message }
      end
    end

    def process_batch(feedbacks)
      results = { processed: 0, failed: 0, errors: [] }

      feedbacks.each do |feedback|
        result = process(feedback)
        if result[:success]
          results[:processed] += 1
        else
          results[:failed] += 1
          results[:errors] << { id: feedback.id, error: result[:error] }
        end

        # Rate limiting - be nice to the API
        sleep(0.5)
      end

      results
    end

    private

    def build_prompt(feedback)
      parts = []
      parts << "Title: #{feedback.title}" if feedback.title.present?
      parts << "Content: #{feedback.content}"
      parts << "Source: #{feedback.source}"
      parts << "Author: #{feedback.author_name}" if feedback.author_name.present?

      parts.join("\n\n")
    end

    def parse_response(response)
      content = response.content&.first&.text
      raise JSON::ParserError, "No content in response" unless content

      # Extract JSON from response (handle potential markdown code blocks)
      json_match = content.match(/\{.*\}/m)
      raise JSON::ParserError, "No JSON found in response" unless json_match

      JSON.parse(json_match[0])
    end

    def update_feedback(feedback, result, alignment_result = nil)
      attrs = {
        category: result["category"],
        priority: result["priority"],
        ai_summary: result["summary"],
        ai_confidence_score: result["confidence"].to_f,
        ai_processed_at: Time.current
      }

      if alignment_result
        attrs[:objective_alignment_score] = alignment_result[:alignment_score]
        attrs[:aligned_objective_ids] = alignment_result[:aligned_objective_ids]
      end

      feedback.update!(attrs)
    end

    def load_active_objectives(feedback)
      return [] unless feedback.project

      BusinessObjective.for_ai_context(project: feedback.project)
    end

    def analyze_objective_alignment(feedback, objectives)
      aligner = ObjectiveAligner.new(project: @project)
      aligner.analyze_feedback(feedback, objectives: objectives)
    rescue => e
      Rails.logger.error("Objective alignment failed for Feedback##{feedback.id}: #{e.message}")
      nil
    end

    def handle_error(feedback, error)
      Rails.logger.error("AI processing failed for Feedback##{feedback.id}: #{error.message}")
      feedback.update!(
        category: :uncategorized,
        priority: :unset,
        ai_summary: "AI processing failed: #{error.message}",
        ai_confidence_score: 0.0,
        ai_processed_at: Time.current
      )
    end

    def handle_parse_error(feedback, error)
      Rails.logger.error("AI response parsing failed for Feedback##{feedback.id}: #{error.message}")
      feedback.update!(
        category: :uncategorized,
        priority: :unset,
        ai_summary: "AI response could not be parsed",
        ai_confidence_score: 0.0,
        ai_processed_at: Time.current
      )
    end
  end
end
