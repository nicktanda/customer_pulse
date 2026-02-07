# frozen_string_literal: true

class WeeklyThemeAnalysisJob
  include Sidekiq::Job

  sidekiq_options queue: :default, retry: 3

  def perform
    insights = Insight.where("created_at > ?", 7.days.ago).actionable

    if insights.empty?
      Rails.logger.info("WeeklyThemeAnalysisJob: No recent insights to analyze")
      return
    end

    orchestrator = Insights::Orchestrator.new
    result = orchestrator.run_theme_analysis(insights: insights)

    Rails.logger.info(
      "WeeklyThemeAnalysisJob completed: " \
      "#{result[:created]} themes created/updated from #{insights.count} insights"
    )

    update_theme_priorities
  end

  private

  def update_theme_priorities
    Theme.find_each do |theme|
      theme.update_insight_count!
      theme.update_priority_score!
    end
  end
end
