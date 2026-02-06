class PulseMailer < ApplicationMailer
  def daily_pulse(pulse_report)
    @report = pulse_report
    @feedbacks = pulse_report.feedbacks.recent
    @high_priority = @feedbacks.high_priority
    @by_category = @feedbacks.group(:category).count
    @by_priority = @feedbacks.group(:priority).count
    @by_source = @feedbacks.group(:source).count

    recipients = EmailRecipient.active.pluck(:email)
    return if recipients.empty?

    mail(
      to: recipients,
      subject: "Customer Pulse - #{@report.period_end.strftime('%B %d, %Y')}"
    )
  end
end
