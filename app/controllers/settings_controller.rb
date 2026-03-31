class SettingsController < ApplicationController
  before_action :authenticate_user!
  before_action :require_project_access!
  before_action :require_project_editor!, except: [:show]

  def show
    @settings = load_settings
    @github_integration = current_project.integrations.find_by(source_type: 'github')
    @anthropic_integration = current_project.integrations.find_by(source_type: 'anthropic')
  end

  def update
    settings = load_settings.merge(settings_params.to_h)
    save_settings(settings)

    redirect_to settings_path, notice: "Settings updated successfully."
  end

  def save_github
    github_params = params.require(:github).permit(:access_token, :owner, :repo, :default_branch, :enabled)

    credentials = {
      access_token: github_params[:access_token],
      owner: github_params[:owner],
      repo: github_params[:repo],
      default_branch: github_params[:default_branch].presence || 'main'
    }.compact

    if credentials[:access_token].blank?
      redirect_to settings_path, alert: "Access token is required."
      return
    end

    integration = current_project.integrations.find_or_initialize_by(source_type: 'github')
    integration.name = "GitHub"
    integration.enabled = github_params[:enabled] == "1"
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

    temp_integration = Integration.new(source_type: 'github', project: current_project)
    temp_integration.update_credentials(credentials)
    result = Integrations::GithubClient.new(temp_integration).test_connection

    render json: result
  end

  def save_anthropic
    anthropic_params = params.require(:anthropic).permit(:api_key, :enabled)

    if anthropic_params[:api_key].blank?
      redirect_to settings_path, alert: "API key is required."
      return
    end

    credentials = { api_key: anthropic_params[:api_key] }

    integration = current_project.integrations.find_or_initialize_by(source_type: 'anthropic')
    integration.name = "Anthropic"
    integration.enabled = anthropic_params[:enabled] == "1"
    integration.update_credentials(credentials)

    if integration.save
      redirect_to settings_path, notice: "Anthropic API key saved successfully."
    else
      redirect_to settings_path, alert: "Failed to save Anthropic API key: #{integration.errors.full_messages.join(', ')}"
    end
  end

  def test_anthropic
    api_key = params.dig(:anthropic, :api_key)

    if api_key.blank?
      render json: { success: false, message: "API key is required" }
      return
    end

    result = AnthropicApiValidator.new(api_key: api_key).validate
    render json: result
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
