class SettingsController < ApplicationController
  before_action :authenticate_user!

  def show
    @settings = load_settings
    @github_integration = Integration.find_by(source_type: 'github')
  end

  def update
    settings = load_settings.merge(settings_params.to_h)
    save_settings(settings)

    redirect_to settings_path, notice: "Settings updated successfully."
  end

  def update_theme
    if current_user&.update(theme_mode: params[:theme_mode])
      redirect_to settings_path, notice: "Theme updated successfully."
    else
      redirect_to settings_path, alert: "Failed to update theme."
    end
  end

  def save_github
    credentials = {
      access_token: params.dig(:github, :access_token),
      owner: params.dig(:github, :owner),
      repo: params.dig(:github, :repo),
      default_branch: params.dig(:github, :default_branch).presence || 'main'
    }.compact

    if credentials[:access_token].blank?
      redirect_to settings_path, alert: "Access token is required."
      return
    end

    integration = Integration.find_or_initialize_by(source_type: 'github')
    integration.name = "GitHub"
    integration.enabled = params.dig(:github, :enabled) == "1"
    integration.update_credentials(credentials)

    if integration.save
      redirect_to settings_path, notice: "GitHub integration saved successfully."
    else
      redirect_to settings_path, alert: "Failed to save GitHub integration: #{integration.errors.full_messages.join(', ')}"
    end
  end

  def test_github
    credentials = {
      'access_token' => params.dig(:github, :access_token),
      'owner' => params.dig(:github, :owner),
      'repo' => params.dig(:github, :repo),
      'default_branch' => params.dig(:github, :default_branch).presence || 'main'
    }

    if credentials['access_token'].blank?
      render json: { success: false, message: "Access token is required" }
      return
    end

    temp_integration = Integration.new(source_type: 'github')
    temp_integration.update_credentials(credentials)
    result = Integrations::GithubClient.new(temp_integration).test_connection

    render json: result
  end

  def disconnect_github
    integration = Integration.find_by(source_type: 'github')
    if integration&.destroy
      redirect_to settings_path, notice: "GitHub integration disconnected."
    else
      redirect_to settings_path, alert: "Failed to disconnect GitHub integration."
    end
  end

  private

  def load_settings
    Rails.cache.fetch("app_settings", expires_in: 1.hour) do
      {
        "pulse_send_time" => "09:00",
        "ai_processing_interval_hours" => 4,
        "default_priority" => "unset",
        "auto_archive_days" => 30,
        "github_auto_merge" => false
      }
    end
  end

  def save_settings(settings)
    Rails.cache.write("app_settings", settings, expires_in: 1.year)
  end

  def settings_params
    params.permit(:pulse_send_time, :ai_processing_interval_hours, :default_priority, :auto_archive_days, :github_auto_merge)
  end
end