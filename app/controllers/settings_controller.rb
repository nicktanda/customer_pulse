class SettingsController < ApplicationController
  before_action :authenticate_user!
  before_action :require_admin!

  def show
    @settings = load_settings
  end

  def update
    settings = load_settings.merge(settings_params.to_h)
    save_settings(settings)

    redirect_to settings_path, notice: "Settings updated successfully."
  end

  private

  def load_settings
    Rails.cache.fetch("app_settings", expires_in: 1.hour) do
      {
        "pulse_send_time" => "09:00",
        "ai_processing_interval_hours" => 4,
        "default_priority" => "unset",
        "auto_archive_days" => 30
      }
    end
  end

  def save_settings(settings)
    Rails.cache.write("app_settings", settings, expires_in: 1.year)
  end

  def settings_params
    params.permit(:pulse_send_time, :ai_processing_interval_hours, :default_priority, :auto_archive_days)
  end
end
