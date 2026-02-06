module Api
  module V1
    class BaseController < ActionController::API
      before_action :authenticate_api_request!

      private

      def authenticate_api_request!
        api_key = request.headers["X-API-Key"] || params[:api_key]

        unless api_key.present?
          return render_unauthorized("API key required")
        end

        # Find integration with matching API key
        @integration = Integration.custom.enabled.find do |integration|
          creds = integration.parsed_credentials
          ActiveSupport::SecurityUtils.secure_compare(creds["api_key"].to_s, api_key)
        end

        unless @integration
          render_unauthorized("Invalid API key")
        end
      end

      def render_unauthorized(message)
        render json: { error: message }, status: :unauthorized
      end

      def render_error(message, status: :unprocessable_entity)
        render json: { error: message }, status: status
      end

      def render_success(data = {})
        render json: data.merge(status: "ok"), status: :ok
      end
    end
  end
end
