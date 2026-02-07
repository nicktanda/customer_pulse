# frozen_string_literal: true

module Ai
  class IdeaGenerator < BaseAnalyzer
    SYSTEM_PROMPT = <<~PROMPT
      You are an expert product strategist generating solution ideas for identified insights.
      For each insight, propose actionable ideas that could address the underlying issue or opportunity.

      For each idea:
      1. Create a clear, actionable title
      2. Write a detailed description of the proposed solution
      3. Classify the type: quick_win, feature, improvement, process_change, or investigation
      4. Estimate effort: trivial, small, medium, large, or extra_large
      5. Estimate impact: minimal, low, moderate, high, or transformational
      6. Provide your confidence score (0-100)
      7. Explain the rationale for this idea
      8. List potential risks or considerations
      9. Provide implementation hints or first steps

      Respond in JSON format:
      {
        "ideas": [
          {
            "title": "Clear idea title",
            "description": "Detailed solution description",
            "idea_type": "quick_win|feature|improvement|process_change|investigation",
            "effort_estimate": "trivial|small|medium|large|extra_large",
            "impact_estimate": "minimal|low|moderate|high|transformational",
            "confidence_score": 75,
            "rationale": "Why this solution makes sense",
            "risks": "Potential risks or considerations",
            "implementation_hints": ["First step", "Second step"]
          }
        ]
      }

      Guidelines:
      - Generate 1-3 ideas per insight
      - Prioritize ideas with high impact and low effort (quick wins)
      - Be specific and actionable
      - Consider both technical and process solutions
      - Include at least one quick win if applicable
    PROMPT

    def generate(insight)
      result = analyze_insight(insight)

      if result[:error]
        Rails.logger.error("Idea generation failed for insight ##{insight.id}: #{result[:error]}")
        return { ideas: [], created: 0, error: result[:error] }
      end

      created = create_ideas_from_result(result, insight)

      { ideas: created, created: created.count }
    end

    def generate_batch(insights)
      all_ideas = []

      insights.each do |insight|
        result = generate(insight)
        all_ideas.concat(result[:ideas]) unless result[:error]
        rate_limit_sleep
      end

      { ideas: all_ideas, created: all_ideas.count }
    end

    private

    def analyze_insight(insight)
      prompt = build_insight_prompt(insight)
      call_claude(prompt, system_prompt: SYSTEM_PROMPT)
    end

    def build_insight_prompt(insight)
      parts = ["Generate solution ideas for the following insight:\n"]
      parts << "Title: #{insight.title}"
      parts << "Description: #{insight.description}"
      parts << "Type: #{insight.insight_type}"
      parts << "Severity: #{insight.severity}"
      parts << "Affected Users: #{insight.affected_users_count}"
      parts << "Feedback Count: #{insight.feedback_count}"

      if insight.evidence.present?
        parts << "\nSupporting Evidence:"
        insight.evidence.each { |e| parts << "- #{e}" }
      end

      parts.join("\n")
    end

    def create_ideas_from_result(result, insight)
      created_ideas = []

      ideas_data = result[:ideas] || []
      ideas_data.each do |idea_data|
        idea = create_idea(idea_data)
        next unless idea

        link_idea_to_insight(idea, insight)
        created_ideas << idea
      end

      created_ideas
    end

    def create_idea(data)
      Idea.create!(
        title: data[:title],
        description: data[:description],
        idea_type: data[:idea_type],
        effort_estimate: data[:effort_estimate],
        impact_estimate: data[:impact_estimate],
        confidence_score: data[:confidence_score] || 0,
        rationale: data[:rationale],
        risks: data[:risks],
        implementation_hints: data[:implementation_hints] || [],
        pm_persona: @pm_persona,
        status: :proposed
      )
    rescue ActiveRecord::RecordInvalid => e
      Rails.logger.error("Failed to create idea: #{e.message}")
      nil
    end

    def link_idea_to_insight(idea, insight)
      IdeaInsight.find_or_create_by!(
        idea: idea,
        insight: insight
      ) do |ii|
        ii.address_level = calculate_address_level(idea)
        ii.address_description = "Generated solution for #{insight.title}"
      end
    end

    def calculate_address_level(idea)
      impact_score = Idea.impact_estimates[idea.impact_estimate] || 0
      case impact_score
      when 4 then 4
      when 3 then 3
      when 2 then 2
      else 1
      end
    end
  end
end
