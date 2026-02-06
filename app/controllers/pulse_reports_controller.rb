class PulseReportsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_pulse_report, only: [:show, :resend]

  def index
    @pagy, @pulse_reports = pagy(PulseReport.recent)
  end

  def show
    @feedbacks = @pulse_report.feedbacks.recent
  end

  def resend
    if @pulse_report.sent?
      PulseMailer.daily_pulse(@pulse_report).deliver_later
      redirect_to @pulse_report, notice: "Pulse report resent to all active recipients."
    else
      redirect_to @pulse_report, alert: "Cannot resend an unsent report."
    end
  end

  private

  def set_pulse_report
    @pulse_report = PulseReport.find(params[:id])
  end
end
