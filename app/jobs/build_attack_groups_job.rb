# frozen_string_literal: true

class BuildAttackGroupsJob
  include Sidekiq::Job

  sidekiq_options queue: :default, retry: 3

  def perform
    insights = Insight.actionable.includes(:themes, :ideas).where("created_at > ?", 30.days.ago)
    ideas = Idea.actionable.where("created_at > ?", 30.days.ago)
    themes = Theme.by_priority.where("created_at > ?", 30.days.ago)

    if insights.empty? && ideas.empty?
      Rails.logger.info("BuildAttackGroupsJob: No recent insights or ideas to group")
      return
    end

    orchestrator = Insights::Orchestrator.new
    result = orchestrator.build_attack_groups(
      insights: insights,
      ideas: ideas,
      themes: themes
    )

    Rails.logger.info(
      "BuildAttackGroupsJob completed: #{result[:count]} attack groups built"
    )

    if result[:groups].any?
      log_attack_groups(result[:groups])
    end
  end

  private

  def log_attack_groups(groups)
    groups.each do |group|
      Rails.logger.info(
        "Attack Group: #{group.name} | " \
        "Insights: #{group.insights.count} | " \
        "Ideas: #{group.ideas.count} | " \
        "Impact: #{group.combined_impact}"
      )
    end
  end
end
