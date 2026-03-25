# frozen_string_literal: true

class GenerateGithubPrJob
  include Sidekiq::Job

  sidekiq_options queue: :default, retry: 2

  def perform(idea_id, integration_id = nil)
    idea = Idea.find(idea_id)
    integration = find_integration(integration_id)

    unless integration
      Rails.logger.error("GenerateGithubPrJob: No GitHub integration found")
      return
    end

    creator = Github::PrCreator.new(idea: idea, integration: integration)
    result = creator.create

    if result[:success]
      Rails.logger.info(
        "GenerateGithubPrJob: Created PR ##{result[:pull_request].pr_number} for idea ##{idea_id}"
      )
    else
      Rails.logger.error(
        "GenerateGithubPrJob: Failed to create PR for idea ##{idea_id}: #{result[:error]}"
      )
    end
  rescue ActiveRecord::RecordNotFound => e
    Rails.logger.error("GenerateGithubPrJob: #{e.message}")
  rescue => e
    Rails.logger.error("GenerateGithubPrJob: Unexpected error for idea ##{idea_id}: #{e.message}")
    raise
  end

  private

  def find_integration(integration_id)
    if integration_id
      Integration.github.enabled.find_by(id: integration_id)
    else
      Integration.github.enabled.first
    end
  end
end
