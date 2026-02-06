class ProcessFeedbackJob
  include Sidekiq::Job

  sidekiq_options queue: :default, retry: 3

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
