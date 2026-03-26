class DashboardController < ApplicationController
  before_action :authenticate_user!
  before_action :require_project_access!

  def index
    feedbacks = current_project.feedbacks
    @total_feedback = feedbacks.count
    @feedback_by_category = feedbacks.group(:category).count
    @feedback_by_priority = feedbacks.group(:priority).count
    @feedback_by_status = feedbacks.group(:status).count
    @feedback_by_source = feedbacks.group(:source).count

    @recent_feedback = feedbacks.recent.limit(10)
    @high_priority_feedback = feedbacks.high_priority.where(status: [:new_feedback, :triaged]).recent.limit(5)

    @today_count = feedbacks.where("created_at >= ?", Time.current.beginning_of_day).count
    @week_count = feedbacks.where("created_at >= ?", 7.days.ago).count
    @unprocessed_count = feedbacks.unprocessed.count

    @latest_pulse_report = current_project.pulse_reports.sent.recent.first
  end
end
