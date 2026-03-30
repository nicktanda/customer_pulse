# frozen_string_literal: true

class GithubAutoMergeJob < ApplicationJob
  queue_as :default
  retry_on StandardError, wait: :polynomially_longer, attempts: 5

  MAX_RETRIES = 10
  RETRY_DELAY = 2.minutes

  def perform(pull_request_id, attempt = 1)
    pull_request = IdeaPullRequest.find(pull_request_id)

    unless pull_request.open?
      Rails.logger.info("GithubAutoMergeJob: PR ##{pull_request.pr_number} is no longer open, skipping")
      return
    end

    unless auto_merge_enabled?
      Rails.logger.info("GithubAutoMergeJob: Auto-merge disabled, skipping PR ##{pull_request.pr_number}")
      return
    end

    client = Integrations::GithubClient.new(pull_request.integration)

    pr_data = client.get_pull_request(pull_request.pr_number)
    unless pr_data[:success]
      Rails.logger.error("GithubAutoMergeJob: Failed to fetch PR ##{pull_request.pr_number}: #{pr_data[:error]}")
      return
    end

    pr = pr_data[:data]

    unless pr["mergeable"]
      if attempt < MAX_RETRIES
        Rails.logger.info("GithubAutoMergeJob: PR ##{pull_request.pr_number} not mergeable yet, retrying (attempt #{attempt}/#{MAX_RETRIES})")
        self.class.set(wait: RETRY_DELAY).perform_later(pull_request_id, attempt + 1)
      else
        Rails.logger.warn("GithubAutoMergeJob: PR ##{pull_request.pr_number} not mergeable after #{MAX_RETRIES} attempts")
      end
      return
    end

    status_result = client.get_combined_status(pr["head"]["sha"])
    if status_result[:success] && status_result[:state] == "pending"
      if attempt < MAX_RETRIES
        Rails.logger.info("GithubAutoMergeJob: CI pending for PR ##{pull_request.pr_number}, retrying (attempt #{attempt}/#{MAX_RETRIES})")
        self.class.set(wait: RETRY_DELAY).perform_later(pull_request_id, attempt + 1)
      else
        Rails.logger.warn("GithubAutoMergeJob: CI still pending for PR ##{pull_request.pr_number} after #{MAX_RETRIES} attempts")
      end
      return
    end

    if status_result[:success] && status_result[:state] == "failure"
      Rails.logger.warn("GithubAutoMergeJob: CI failed for PR ##{pull_request.pr_number}, not merging")
      pull_request.update!(error_message: "CI checks failed")
      return
    end

    merge_result = client.merge_pull_request(
      pull_request.pr_number,
      commit_message: "Auto-merged by Customer Pulse"
    )

    if merge_result[:success]
      pull_request.update!(status: :merged, merged_at: Time.current)
      Rails.logger.info("GithubAutoMergeJob: Successfully merged PR ##{pull_request.pr_number}")
    else
      Rails.logger.error("GithubAutoMergeJob: Failed to merge PR ##{pull_request.pr_number}: #{merge_result[:error]}")

      if attempt < MAX_RETRIES
        self.class.set(wait: RETRY_DELAY).perform_later(pull_request_id, attempt + 1)
      end
    end
  rescue ActiveRecord::RecordNotFound => e
    Rails.logger.error("GithubAutoMergeJob: #{e.message}")
  rescue => e
    Rails.logger.error("GithubAutoMergeJob: Unexpected error: #{e.message}")
    raise
  end

  private

  def auto_merge_enabled?
    settings = Rails.cache.fetch("app_settings", expires_in: 1.hour) { {} }
    settings["github_auto_merge"] == true || settings["github_auto_merge"] == "true"
  end
end
