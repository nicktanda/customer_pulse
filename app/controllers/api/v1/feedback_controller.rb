module Api
  module V1
    class FeedbackController < BaseController
      def create
        feedback = Feedback.new(feedback_params)
        feedback.source = :custom
        feedback.source_external_id = params[:external_id] if params[:external_id].present?

        if feedback.save
          render_success(
            id: feedback.id,
            message: "Feedback created successfully"
          )
        else
          render_error(feedback.errors.full_messages.join(", "))
        end
      end

      private

      def feedback_params
        params.permit(:title, :content, :author_name, :author_email, :category, :priority, :raw_data)
      end
    end
  end
end
