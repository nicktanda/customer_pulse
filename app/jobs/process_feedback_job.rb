class ProcessFeedbackJob < ApplicationJob
  queue_as :default
  retry_on StandardError, wait: :polynomially_longer, attempts: 3

  def perform(feedback_id)
    feedback = Feedback.find_by(id: feedback_id)
    return unless feedback

    processor = Ai::FeedbackProcessor.new
    result = processor.process(feedback)

    if result[:success]
      Rails.logger.info("ProcessFeedbackJob: Successfully processed Feedback##{feedback_id}")
    else
      Rails.logger.error("ProcessFeedbackJob: Failed to process Feedback##{feedback_id}: #{result[:error]}")
    end
  end
end
