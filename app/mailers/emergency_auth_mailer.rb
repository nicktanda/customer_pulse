# frozen_string_literal: true

class EmergencyAuthMailer < ApplicationMailer
  def magic_link(user, token)
    @user = user
    @magic_link = emergency_verify_url(token: token)
    @expires_at = 15.minutes.from_now
    
    mail(
      to: user.email,
      subject: "[EMERGENCY] Your temporary access link",
      from: "noreply@#{Rails.application.credentials.dig(:domain) || 'localhost'}"
    )
  end
  
  private
  
  def emergency_verify_url(token:)
    # This would be your app's emergency auth verification URL
    # Adjust the host based on your environment
    host = Rails.env.production? ? Rails.application.credentials.dig(:domain) : 'localhost:3000'
    protocol = Rails.env.production? ? 'https' : 'http'
    
    "#{protocol}://#{host}/api/v1/emergency_auth/verify_magic_link?token=#{token}"
  end
end