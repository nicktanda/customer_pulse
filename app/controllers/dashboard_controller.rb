class DashboardController < ApplicationController
  before_action :authenticate_user!

  def index
    @total_feedback = Feedback.count
    @feedback_by_category = Feedback.group(:category).count
    @feedback_by_priority = Feedback.group(:priority).count
    @feedback_by_status = Feedback.group(:status).count
    @feedback_by_source = Feedback.group(:source).count

    @recent_feedback = Feedback.recent.limit(10)
    @high_priority_feedback = Feedback.high_priority.where(status: [:new_feedback, :triaged]).recent.limit(5)

    @today_count = Feedback.where("created_at >= ?", Time.current.beginning_of_day).count
    @week_count = Feedback.where("created_at >= ?", 7.days.ago).count
    @unprocessed_count = Feedback.unprocessed.count

    @latest_pulse_report = PulseReport.sent.recent.first
  end
end
