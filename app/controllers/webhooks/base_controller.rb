module Webhooks
  class BaseController < ActionController::API
    before_action :verify_webhook_signature

    protected

    def verify_webhook_signature
      # Override in subclasses
    end

    def render_success
      render json: { status: "ok" }, status: :ok
    end

    def render_error(message, status: :unprocessable_entity)
      render json: { error: message }, status: status
    end
  end
end
