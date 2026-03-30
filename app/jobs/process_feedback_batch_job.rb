class ProcessFeedbackBatchJob < ApplicationJob
  queue_as :default
  retry_on StandardError, wait: :polynomially_longer, attempts: 3

  def perform
    feedbacks = Feedback.unprocessed.limit(100)

    return if feedbacks.empty?

    processor = Ai::FeedbackProcessor.new
    results = processor.process_batch(feedbacks)

    Rails.logger.info(
      "ProcessFeedbackBatchJob completed: #{results[:processed]} processed, #{results[:failed]} failed"
    )

    # If there are more unprocessed items, queue another job
    if Feedback.unprocessed.exists?
      ProcessFeedbackBatchJob.set(wait: 1.minute).perform_later
    end
  end
end
