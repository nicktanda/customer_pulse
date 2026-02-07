# frozen_string_literal: true

module Ai
  class ThemeIdentifier < BaseAnalyzer
    SYSTEM_PROMPT = <<~PROMPT
      You are an expert at identifying patterns and themes across product insights.
      Analyze the insights and group them into high-level themes that represent
      common patterns, problem areas, or opportunity spaces.

      For each theme:
      1. Create a clear, memorable name
      2. Write a description explaining what this theme encompasses
      3. Assign a priority score (0-100) based on combined severity and user impact
      4. Estimate total affected users across all insights in this theme
      5. List which insights (by index, 0-based) belong to this theme

      An insight can belong to multiple themes if relevant.

      Respond in JSON format:
      {
        "themes": [
          {
            "name": "Theme name",
            "description": "What this theme represents",
            "priority_score": 85,
            "affected_users_estimate": 500,
            "insight_indices": [0, 2, 5, 7]
          }
        ]
      }

      Guidelines:
      - Create 3-7 themes that meaningfully group the insights
      - Theme names should be concise and memorable (2-4 words)
      - Higher priority for themes with many critical/major insights
      - Don't create themes for single insights unless they're significant
      - Look for both problem themes and opportunity themes
    PROMPT

    def identify(insights)
      return { themes: [], created: 0 } if insights.empty?

      insight_array = insights.to_a
      result = analyze_insights(insight_array)

      if result[:error]
        Rails.logger.error("Theme identification failed: #{result[:error]}")
        return { themes: [], created: 0, error: result[:error] }
      end

      created = create_themes_from_result(result, insight_array)

      { themes: created, created: created.count }
    end

    def reanalyze_all
      insights = Insight.actionable.includes(:themes)
      identify(insights)
    end

    private

    def analyze_insights(insights)
      prompt = build_insights_prompt(insights)
      call_claude(prompt, system_prompt: SYSTEM_PROMPT)
    end

    def build_insights_prompt(insights)
      parts = ["Analyze the following #{insights.count} product insights and identify themes:\n"]

      insights.each_with_index do |insight, index|
        parts << "--- Insight ##{index} ---"
        parts << "Title: #{insight.title}"
        parts << "Description: #{insight.description}"
        parts << "Type: #{insight.insight_type}"
        parts << "Severity: #{insight.severity}"
        parts << "Affected Users: #{insight.affected_users_count}"
        parts << "Feedback Count: #{insight.feedback_count}"
        parts << ""
      end

      parts.join("\n")
    end

    def create_themes_from_result(result, insights)
      created_themes = []

      themes_data = result[:themes] || []
      themes_data.each do |theme_data|
        theme = find_or_create_theme(theme_data)
        next unless theme

        link_insights_to_theme(theme, theme_data, insights)
        theme.update_insight_count!
        theme.update!(analyzed_at: Time.current)

        created_themes << theme
      end

      created_themes
    end

    def find_or_create_theme(data)
      existing = Theme.find_by("LOWER(name) = ?", data[:name].downcase)
      return update_theme(existing, data) if existing

      Theme.create!(
        name: data[:name],
        description: data[:description],
        priority_score: data[:priority_score] || 0,
        affected_users_estimate: data[:affected_users_estimate] || 0
      )
    rescue ActiveRecord::RecordInvalid => e
      Rails.logger.error("Failed to create theme: #{e.message}")
      nil
    end

    def update_theme(theme, data)
      theme.update!(
        description: data[:description],
        priority_score: [theme.priority_score, data[:priority_score] || 0].max,
        affected_users_estimate: [theme.affected_users_estimate, data[:affected_users_estimate] || 0].max
      )
      theme
    end

    def link_insights_to_theme(theme, data, insights)
      indices = data[:insight_indices] || []
      indices.each do |index|
        insight = insights[index]
        next unless insight

        InsightTheme.find_or_create_by!(
          insight: insight,
          theme: theme
        ) do |it|
          it.relevance_score = calculate_relevance(index, indices)
        end
      end
    end

    def calculate_relevance(index, all_indices)
      return 1.0 if all_indices.count == 1
      (1.0 - (all_indices.index(index).to_f / all_indices.count)).round(2)
    end
  end
end
