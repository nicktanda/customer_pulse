class PulseReportsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_pulse_report, only: [:show, :resend]

  def index
    @pagy, @pulse_reports = pagy(PulseReport.recent)
  end

  def show
    @report = @pulse_report
    @feedbacks = @report.feedbacks.recent
    @insights = Insight.recent.includes(:ideas).limit(10)
    @quick_wins = Idea.quick_wins.includes(:idea_pull_requests).by_impact.limit(5)
    @high_impact = Idea.high_impact_low_effort.includes(:idea_pull_requests).limit(5)
    @github_integration = Integration.github.enabled.first
  end

  def generate_pr
    idea = Idea.find(params[:idea_id])
    integration = Integration.github.enabled.first

    unless integration
      flash[:alert] = "GitHub integration is not configured. Please set it up in onboarding first."
      redirect_back fallback_location: pulse_reports_path
      return
    end

    existing_pending = idea.idea_pull_requests.where(status: [:pending, :open]).first
    if existing_pending
      flash[:alert] = "A PR is already #{existing_pending.status} for this idea."
      redirect_back fallback_location: pulse_reports_path
      return
    end

    GenerateGithubPrJob.perform_async(idea.id, integration.id)

    flash[:notice] = "PR generation started for \"#{idea.title}\". This may take a few minutes."
    redirect_back fallback_location: pulse_reports_path
  end

  def resend
    if @pulse_report.sent?
      PulseMailer.daily_pulse(@pulse_report).deliver_later
      redirect_to @pulse_report, notice: "Pulse report resent to all active recipients."
    else
      redirect_to @pulse_report, alert: "Cannot resend an unsent report."
    end
  end

  def generate
    generator = PulseGenerator.new(
      period_start: 24.hours.ago,
      period_end: Time.current
    )
    report = generator.generate

    # Generate insights from feedback that hasn't been analyzed yet
    feedbacks = Feedback.insight_unprocessed.limit(50)
    if feedbacks.any?
      discoverer = Ai::InsightDiscoverer.new
      insights_result = discoverer.discover(feedbacks)
      Rails.logger.info("Generated #{insights_result[:created]} insights from #{feedbacks.count} feedback items")
    end

    # Generate ideas for insights that don't have ideas yet
    new_insights = Insight.actionable.where("id NOT IN (SELECT DISTINCT insight_id FROM idea_insights)").limit(10)
    if new_insights.any?
      idea_generator = Ai::IdeaGenerator.new
      ideas_result = idea_generator.generate_batch(new_insights)
      Rails.logger.info("Generated ideas for #{new_insights.count} insights")
    end

    recipients = EmailRecipient.active
    if recipients.any?
      begin
        PulseMailer.daily_pulse(report).deliver_now
        report.mark_sent!(recipient_count: recipients.count)
        redirect_to pulse_report_path(report), notice: "Pulse report generated and sent to #{recipients.count} recipient(s)."
      rescue => e
        Rails.logger.error("Failed to send pulse email: #{e.message}")
        redirect_to pulse_report_path(report), alert: "Report generated but email failed: #{e.message}"
      end
    else
      redirect_to pulse_report_path(report), notice: "Pulse report generated (no recipients configured to send to)."
    end
  rescue => e
    redirect_to pulse_reports_path, alert: "Failed to generate report: #{e.message}"
  end

  private

  def set_pulse_report
    @pulse_report = PulseReport.find(params[:id])
  end
end
