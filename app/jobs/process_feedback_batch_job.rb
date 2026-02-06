class ProcessFeedbackBatchJob
  include Sidekiq::Job

  sidekiq_options queue: :default, retry: 3

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
      ProcessFeedbackBatchJob.perform_in(1.minute)
    end
  end
end
