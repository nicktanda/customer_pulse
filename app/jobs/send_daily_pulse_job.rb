class SendDailyPulseJob
  include Sidekiq::Job

  sidekiq_options queue: :mailers, retry: 3

  def perform
    # Generate the pulse report for the last 24 hours
    generator = PulseGenerator.new(
      period_start: 24.hours.ago,
      period_end: Time.current
    )
    report = generator.generate

    # Get active recipients
    recipients = EmailRecipient.active

    if recipients.empty?
      Rails.logger.warn("SendDailyPulseJob: No active recipients configured")
      return
    end

    # Send the email
    PulseMailer.daily_pulse(report).deliver_now

    # Mark report as sent
    report.mark_sent!(recipient_count: recipients.count)

    Rails.logger.info(
      "SendDailyPulseJob: Sent pulse report to #{recipients.count} recipients"
    )
  rescue => e
    Rails.logger.error("SendDailyPulseJob: Failed to send pulse: #{e.message}")
    raise # Re-raise to trigger Sidekiq retry
  end
end
