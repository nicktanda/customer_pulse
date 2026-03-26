# frozen_string_literal: true

class Users::OmniauthCallbacksController < Devise::OmniauthCallbacksController
  def google_oauth2
    @user = User.from_omniauth(request.env['omniauth.auth'])

    if @user.persisted?
      flash[:notice] = I18n.t('devise.omniauth_callbacks.success', kind: 'Google')
      sign_in_and_redirect @user, event: :authentication
    else
      session['devise.google_data'] = request.env['omniauth.auth'].except(:extra)
      redirect_to new_user_registration_url, alert: @user.errors.full_messages.join("\n")
    end
  end

  def failure
    redirect_to root_path, alert: "Authentication failed: #{failure_message}"
  end

  private

  def failure_message
    exception = request.env['omniauth.error']
    error_type = request.env['omniauth.error.type']

    if exception
      exception.message
    elsif error_type
      error_type.to_s.humanize
    else
      'Unknown error'
    end
  end
end
