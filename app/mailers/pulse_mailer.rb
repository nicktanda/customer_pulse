class PulseMailer < ApplicationMailer
  def daily_pulse(pulse_report)
    @report = pulse_report
    @feedbacks = pulse_report.feedbacks
    @high_priority = @feedbacks.high_priority.recent
    @by_category = @feedbacks.group(:category).count
    @by_priority = @feedbacks.group(:priority).count
    @by_source = @feedbacks.group(:source).count

    # Include insights and ideas
    @insights = Insight.recent.limit(5)
    @quick_wins = Idea.quick_wins.by_impact.limit(3)
    @top_ideas = Idea.high_impact_low_effort.limit(3)

    recipients = EmailRecipient.active.pluck(:email)
    return if recipients.empty?

    mail(
      to: recipients,
      subject: "Customer Pulse - #{@report.period_end.strftime('%B %d, %Y')}"
    )
  end
end
