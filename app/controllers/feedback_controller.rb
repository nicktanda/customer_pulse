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

    @pagy, @feedbacks = pagy(feedbacks)
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

  private

  def set_feedback
    @feedback = Feedback.find(params[:id])
  end

  def feedback_params
    params.require(:feedback).permit(:status, :priority, :category, :manually_reviewed)
  end
end
