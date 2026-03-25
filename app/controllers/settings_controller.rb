# frozen_string_literal: true

class SettingsController < ApplicationController
  before_action :authenticate_user!

  def show
    @user = current_user
  end

  def update
    @user = current_user
    
    if user_params[:accessibility_preferences].present?
      update_accessibility_preferences
    end

    if @user.update(user_params.except(:accessibility_preferences))
      redirect_to settings_path, notice: 'Settings updated successfully.'
    else
      render :show, status: :unprocessable_entity
    end
  end

  private

  def user_params
    params.require(:user).permit(:name, :email, accessibility_preferences: {})
  end

  def update_accessibility_preferences
    theme_pref = user_params.dig(:accessibility_preferences, :theme)
    if theme_pref.present?
      @user.theme_preference = theme_pref
    end
  end
end