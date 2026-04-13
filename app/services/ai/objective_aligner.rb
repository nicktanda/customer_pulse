# frozen_string_literal: true

module Ai
  class ObjectiveAligner < BaseAnalyzer
    SYSTEM_PROMPT = <<~PROMPT
      You are an expert business analyst evaluating how customer feedback aligns with strategic business objectives.

      Your task is to:
      1. Analyze the feedback content
      2. Compare it against the provided business objectives
      3. Determine how well addressing this feedback would support or contradict business goals
      4. Provide an objective alignment score and identify which objectives are relevant

      Scoring Guidelines:
      - 1.0: Directly supports a critical business objective
      - 0.8-0.9: Strongly aligns with high-priority objectives
      - 0.6-0.7: Moderately aligns with business objectives
      - 0.4-0.5: Weakly aligns or is neutral to business objectives
      - 0.2-0.3: Potentially contradicts lower-priority objectives
      - 0.0-0.1: Directly contradicts critical business objectives

      Consider:
      - Does addressing this feedback help achieve stated objectives?
      - Could this feedback lead the product in a direction that conflicts with strategy?
      - Is this a distraction from core objectives or a valuable insight?
      - What is the business impact of acting (or not acting) on this feedback?

      Respond in JSON format:
      {
        "alignment_score": 0.75,
        "aligned_objective_ids": [1, 3],
        "contradicted_objective_ids": [],
        "analysis": "Brief explanation of the alignment assessment",
        "business_impact": "How addressing this feedback affects business goals"
      }
    PROMPT

    def analyze_feedback(feedback, objectives:)
      return default_result if objectives.empty?

      prompt = build_feedback_prompt(feedback, objectives)
      result = call_claude(prompt, system_prompt: SYSTEM_PROMPT)

      return default_result if result[:error]

      {
        alignment_score: result[:alignment_score]&.to_f || 0.5,
        aligned_objective_ids: result[:aligned_objective_ids] || [],
        contradicted_objective_ids: result[:contradicted_objective_ids] || [],
        analysis: result[:analysis],
        business_impact: result[:business_impact]
      }
    end

    def analyze_insight(insight, objectives:)
      return default_result if objectives.empty?

      prompt = build_insight_prompt(insight, objectives)
      result = call_claude(prompt, system_prompt: SYSTEM_PROMPT)

      return default_result if result[:error]

      {
        alignment_score: result[:alignment_score]&.to_f || 0.5,
        aligned_objective_ids: result[:aligned_objective_ids] || [],
        contradicted_objective_ids: result[:contradicted_objective_ids] || [],
        analysis: result[:analysis],
        business_impact: result[:business_impact]
      }
    end

    def analyze_idea(idea, objectives:)
      return default_result if objectives.empty?

      prompt = build_idea_prompt(idea, objectives)
      result = call_claude(prompt, system_prompt: SYSTEM_PROMPT)

      return default_result if result[:error]

      {
        alignment_score: result[:alignment_score]&.to_f || 0.5,
        aligned_objective_ids: result[:aligned_objective_ids] || [],
        contradicted_objective_ids: result[:contradicted_objective_ids] || [],
        analysis: result[:analysis],
        business_impact: result[:business_impact]
      }
    end

    private

    def build_feedback_prompt(feedback, objectives)
      <<~PROMPT
        Analyze this customer feedback against our business objectives:

        ## Feedback
        Title: #{feedback.title}
        Content: #{feedback.content}
        Category: #{feedback.category}
        Priority: #{feedback.priority}
        Source: #{feedback.source}

        ## Business Objectives
        #{format_objectives(objectives)}

        Evaluate how well addressing this feedback aligns with our business objectives.
      PROMPT
    end

    def build_insight_prompt(insight, objectives)
      <<~PROMPT
        Analyze this product insight against our business objectives:

        ## Insight
        Title: #{insight.title}
        Description: #{insight.description}
        Type: #{insight.insight_type}
        Severity: #{insight.severity}
        Affected Users: #{insight.affected_users_count}

        ## Business Objectives
        #{format_objectives(objectives)}

        Evaluate how well addressing this insight aligns with our business objectives.
      PROMPT
    end

    def build_idea_prompt(idea, objectives)
      <<~PROMPT
        Analyze this product idea against our business objectives:

        ## Idea
        Title: #{idea.title}
        Description: #{idea.description}
        Type: #{idea.idea_type}
        Effort: #{idea.effort_estimate}
        Impact: #{idea.impact_estimate}
        Rationale: #{idea.rationale}

        ## Business Objectives
        #{format_objectives(objectives)}

        Evaluate how well implementing this idea aligns with our business objectives.
      PROMPT
    end

    def format_objectives(objectives)
      objectives.map do |obj|
        obj_hash = obj.is_a?(Hash) ? obj : obj.attributes.symbolize_keys
        <<~OBJ
          [ID: #{obj_hash[:id]}] #{obj_hash[:title]}
          Type: #{obj_hash[:objective_type] || obj_hash[:type]}
          Priority: #{obj_hash[:priority]}
          Description: #{obj_hash[:description]}
          Success Metrics: #{obj_hash[:success_metrics]}
        OBJ
      end.join("\n")
    end

    def default_result
      {
        alignment_score: 0.5,
        aligned_objective_ids: [],
        contradicted_objective_ids: [],
        analysis: "No objectives defined for alignment analysis",
        business_impact: nil
      }
    end
  end
end
