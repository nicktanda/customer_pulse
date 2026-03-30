# frozen_string_literal: true

class GenerateInsightsJob < ApplicationJob
  queue_as :default
  retry_on StandardError, wait: :polynomially_longer, attempts: 3

  def perform(pm_persona_id: nil)
    feedbacks = Feedback.ready_for_insights.limit(100)

    if feedbacks.empty?
      Rails.logger.info("GenerateInsightsJob: No feedbacks ready for insight processing")
      return
    end

    pm_persona = pm_persona_id ? PmPersona.find_by(id: pm_persona_id) : nil
    orchestrator = Insights::Orchestrator.new(pm_persona: pm_persona)
    results = orchestrator.run_full_pipeline(feedbacks: feedbacks)

    Rails.logger.info(
      "GenerateInsightsJob completed: " \
      "#{results[:insights_created]} insights, " \
      "#{results[:themes_created]} themes, " \
      "#{results[:ideas_created]} ideas created"
    )

    if Feedback.ready_for_insights.exists?
      GenerateInsightsJob.set(wait: 5.minutes).perform_later
    end
  end
end
