# frozen_string_literal: true

module Ai
  class AttackGroupBuilder < BaseAnalyzer
    SYSTEM_PROMPT = <<~PROMPT
      You are an expert at creating coordinated action plans for addressing product issues.
      Analyze the insights, themes, and ideas to create "attack groups" - bundles of related
      issues and solutions that should be tackled together for maximum impact.

      For each attack group:
      1. Create a compelling name for the initiative
      2. Write an executive summary
      3. List the insights being addressed (by index)
      4. List the recommended ideas to implement (by index)
      5. Identify the key themes this addresses (by index)
      6. Estimate combined effort and impact
      7. Suggest an execution order for the ideas
      8. Highlight dependencies and risks

      Respond in JSON format:
      {
        "attack_groups": [
          {
            "name": "Initiative name",
            "summary": "Executive summary of this coordinated effort",
            "insight_indices": [0, 2, 5],
            "idea_indices": [1, 3, 4],
            "theme_indices": [0],
            "combined_effort": "medium",
            "combined_impact": "high",
            "execution_order": [3, 1, 4],
            "dependencies": "What must be in place first",
            "risks": "Key risks to watch for",
            "success_metrics": ["Metric 1", "Metric 2"]
          }
        ]
      }

      Guidelines:
      - Create 2-5 attack groups based on natural clusters
      - Prioritize groups with high impact and manageable effort
      - Ensure ideas in a group logically belong together
      - Consider dependencies between ideas when setting execution order
      - Include measurable success criteria
    PROMPT

    AttackGroup = Struct.new(
      :name, :summary, :insights, :ideas, :themes,
      :combined_effort, :combined_impact, :execution_order,
      :dependencies, :risks, :success_metrics,
      keyword_init: true
    )

    def build(insights:, ideas:, themes:)
      return { groups: [] } if insights.empty? && ideas.empty?

      insights_array = insights.to_a
      ideas_array = ideas.to_a
      themes_array = themes.to_a

      result = analyze_components(insights_array, ideas_array, themes_array)

      if result[:error]
        Rails.logger.error("Attack group building failed: #{result[:error]}")
        return { groups: [], error: result[:error] }
      end

      groups = build_groups_from_result(result, insights_array, ideas_array, themes_array)

      { groups: groups, count: groups.count }
    end

    private

    def analyze_components(insights, ideas, themes)
      prompt = build_components_prompt(insights, ideas, themes)
      call_claude(prompt, system_prompt: SYSTEM_PROMPT, max_tokens: 8192)
    end

    def build_components_prompt(insights, ideas, themes)
      parts = ["Create coordinated attack groups from the following components:\n"]

      parts << "\n=== INSIGHTS (#{insights.count}) ==="
      insights.each_with_index do |insight, index|
        parts << "--- Insight ##{index} ---"
        parts << "Title: #{insight.title}"
        parts << "Type: #{insight.insight_type} | Severity: #{insight.severity}"
        parts << "Description: #{insight.description[0..200]}..."
        parts << ""
      end

      parts << "\n=== IDEAS (#{ideas.count}) ==="
      ideas.each_with_index do |idea, index|
        parts << "--- Idea ##{index} ---"
        parts << "Title: #{idea.title}"
        parts << "Type: #{idea.idea_type} | Effort: #{idea.effort_estimate} | Impact: #{idea.impact_estimate}"
        parts << "Description: #{idea.description[0..200]}..."
        parts << ""
      end

      parts << "\n=== THEMES (#{themes.count}) ==="
      themes.each_with_index do |theme, index|
        parts << "--- Theme ##{index} ---"
        parts << "Name: #{theme.name}"
        parts << "Priority: #{theme.priority_score}"
        parts << "Description: #{theme.description[0..200]}..." if theme.description
        parts << ""
      end

      parts.join("\n")
    end

    def build_groups_from_result(result, insights, ideas, themes)
      groups_data = result[:attack_groups] || []

      groups_data.map do |group_data|
        build_group(group_data, insights, ideas, themes)
      end.compact
    end

    def build_group(data, insights, ideas, themes)
      group_insights = (data[:insight_indices] || []).map { |i| insights[i] }.compact
      group_ideas = (data[:idea_indices] || []).map { |i| ideas[i] }.compact
      group_themes = (data[:theme_indices] || []).map { |i| themes[i] }.compact

      return nil if group_insights.empty? && group_ideas.empty?

      ordered_ideas = if data[:execution_order].present?
        data[:execution_order].map { |i| ideas[i] }.compact
      else
        group_ideas
      end

      AttackGroup.new(
        name: data[:name],
        summary: data[:summary],
        insights: group_insights,
        ideas: ordered_ideas,
        themes: group_themes,
        combined_effort: data[:combined_effort],
        combined_impact: data[:combined_impact],
        execution_order: data[:execution_order],
        dependencies: data[:dependencies],
        risks: data[:risks],
        success_metrics: data[:success_metrics] || []
      )
    end
  end
end
