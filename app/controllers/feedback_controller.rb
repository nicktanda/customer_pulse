class FeedbackController < ApplicationController
  include Pagy::Backend

  before_action :authenticate_user!
  before_action :set_feedback, only: [:show, :update, :override, :reprocess]

  def index
    feedbacks = Feedback.recent

    # Apply filters
    feedbacks = feedbacks.where(source: params[:source]) if params[:source].present?
    feedbacks = feedbacks.where(category: params[:category]) if params[:category].present?
    feedbacks = feedbacks.where(priority: params[:priority]) if params[:priority].present?
    feedbacks = feedbacks.where(status: params[:status]) if params[:status].present?

    # Search
    if params[:q].present?
      search_term = "%#{params[:q]}%"
      feedbacks = feedbacks.where(
        "title ILIKE :q OR content ILIKE :q OR author_name ILIKE :q OR author_email ILIKE :q",
        q: search_term
      )
    end

    respond_to do |format|
      format.html do
        @pagy, @feedbacks = pagy(feedbacks)
      end
      format.csv do
        @feedbacks = feedbacks.limit(10000) # Reasonable limit for CSV export
        send_data generate_csv(@feedbacks), filename: "feedback_export_#{Date.current}.csv", type: 'text/csv'
      end
    end
  end

  def show
  end

  def update
    if @feedback.update(feedback_params)
      respond_to do |format|
        format.html { redirect_to @feedback, notice: "Feedback updated successfully." }
        format.turbo_stream { flash.now[:notice] = "Feedback updated successfully." }
      end
    else
      render :show, status: :unprocessable_entity
    end
  end

  def override
    @feedback.update!(
      category: params[:category],
      priority: params[:priority],
      status: params[:status],
      manually_reviewed: true
    )

    respond_to do |format|
      format.html { redirect_to @feedback, notice: "Feedback overridden successfully." }
      format.turbo_stream { flash.now[:notice] = "Override applied." }
    end
  end

  def reprocess
    ProcessFeedbackJob.perform_async(@feedback.id)
    redirect_to @feedback, notice: "Feedback queued for reprocessing."
  end

  def bulk_update
    feedback_ids = params[:feedback_ids] || []
    updates = {}
    updates[:status] = params[:status] if params[:status].present?
    updates[:priority] = params[:priority] if params[:priority].present?
    updates[:category] = params[:category] if params[:category].present?

    if feedback_ids.any? && updates.any?
      Feedback.where(id: feedback_ids).update_all(updates)
      flash[:notice] = "#{feedback_ids.count} feedback items updated."
    else
      flash[:alert] = "No items selected or no updates specified."
    end

    redirect_to feedback_index_path
  end

  def export_csv
    feedbacks = Feedback.all
    
    # Apply same filters as index
    feedbacks = feedbacks.where(source: params[:source]) if params[:source].present?
    feedbacks = feedbacks.where(category: params[:category]) if params[:category].present?
    feedbacks = feedbacks.where(priority: params[:priority]) if params[:priority].present?
    feedbacks = feedbacks.where(status: params[:status]) if params[:status].present?

    if params[:q].present?
      search_term = "%#{params[:q]}%"
      feedbacks = feedbacks.where(
        "title ILIKE :q OR content ILIKE :q OR author_name ILIKE :q OR author_email ILIKE :q",
        q: search_term
      )
    end

    # Limit to prevent memory issues
    feedbacks = feedbacks.limit(10000).recent

    respond_to do |format|
      format.csv do
        send_data generate_csv(feedbacks), 
                  filename: "feedback_export_#{Date.current.strftime('%Y%m%d')}.csv", 
                  type: 'text/csv',
                  disposition: 'attachment'
      end
    end
  rescue => e
    Rails.logger.error "CSV Export Error: #{e.message}"
    Rails.logger.error e.backtrace.join("\n")
    
    respond_to do |format|
      format.csv do
        redirect_to feedback_index_path, alert: "CSV export failed. Please try again or contact support."
      end
    end
  end

  private

  def set_feedback
    @feedback = Feedback.find(params[:id])
  end

  def feedback_params
    params.require(:feedback).permit(:status, :priority, :category, :manually_reviewed)
  end

  def generate_csv(feedbacks)
    require 'csv'
    
    CSV.generate(headers: true) do |csv|
      # CSV Headers
      csv << [
        'ID',
        'Title', 
        'Content',
        'Author Name',
        'Author Email',
        'Source',
        'Category',
        'Priority', 
        'Status',
        'Created At',
        'Updated At',
        'Manually Reviewed'
      ]

      # CSV Data
      feedbacks.find_each do |feedback|
        csv << [
          feedback.id,
          feedback.title,
          feedback.content&.truncate(500), # Limit content length
          feedback.author_name,
          feedback.author_email,
          feedback.source,
          feedback.category,
          feedback.priority,
          feedback.status,
          feedback.created_at&.strftime('%Y-%m-%d %H:%M:%S'),
          feedback.updated_at&.strftime('%Y-%m-%d %H:%M:%S'),
          feedback.manually_reviewed? ? 'Yes' : 'No'
        ]
      end
    end
  end
end