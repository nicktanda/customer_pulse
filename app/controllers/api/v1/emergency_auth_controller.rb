# frozen_string_literal: true

module Api
  module V1
    class EmergencyAuthController < BaseController
      skip_before_action :authenticate_user!
      before_action :check_emergency_bypass_enabled
      before_action :rate_limit_requests

      def request_otp
        phone = normalize_phone_number(params[:phone])
        return render_error("Invalid phone number", :bad_request) unless phone

        user = User.find_by(phone: phone)
        return render_error("Phone number not found", :not_found) unless user

        otp_code = generate_otp_code
        store_otp(user.id, otp_code)
        
        result = send_sms_otp(phone, otp_code)
        
        if result[:success]
          render json: { 
            success: true, 
            message: "OTP sent to your phone",
            expires_in: 300 # 5 minutes
          }
        else
          render_error("Failed to send OTP: #{result[:error]}", :service_unavailable)
        end
      rescue => e
        Rails.logger.error("Emergency OTP request failed: #{e.message}")
        render_error("Service temporarily unavailable", :service_unavailable)
      end

      def verify_otp
        phone = normalize_phone_number(params[:phone])
        otp_code = params[:otp_code]&.strip
        
        return render_error("Phone and OTP code required", :bad_request) unless phone && otp_code

        user = User.find_by(phone: phone)
        return render_error("Phone number not found", :not_found) unless user

        stored_otp = retrieve_otp(user.id)
        return render_error("OTP expired or not found", :unauthorized) unless stored_otp
        
        unless ActiveSupport::SecurityUtils.secure_compare(otp_code, stored_otp)
          increment_failed_attempts(user.id)
          return render_error("Invalid OTP code", :unauthorized)
        end

        # Clear OTP and generate auth token
        clear_otp(user.id)
        clear_failed_attempts(user.id)
        
        token = generate_emergency_auth_token(user)
        
        # Log emergency auth usage
        Rails.logger.warn("Emergency authentication used by user #{user.id} (#{user.email})")
        
        render json: {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name
          },
          token: token,
          expires_in: 3600, # 1 hour
          is_emergency_session: true
        }
      rescue => e
        Rails.logger.error("Emergency OTP verification failed: #{e.message}")
        render_error("Service temporarily unavailable", :service_unavailable)
      end

      def request_email_link
        email = params[:email]&.downcase&.strip
        return render_error("Email required", :bad_request) unless email

        user = User.find_by(email: email)
        return render_error("Email not found", :not_found) unless user

        magic_token = generate_magic_token
        store_magic_token(user.id, magic_token)
        
        result = send_magic_link_email(user, magic_token)
        
        if result[:success]
          render json: { 
            success: true, 
            message: "Magic link sent to your email",
            expires_in: 900 # 15 minutes
          }
        else
          render_error("Failed to send email: #{result[:error]}", :service_unavailable)
        end
      rescue => e
        Rails.logger.error("Emergency email link request failed: #{e.message}")
        render_error("Service temporarily unavailable", :service_unavailable)
      end

      def verify_magic_link
        token = params[:token]
        return render_error("Token required", :bad_request) unless token

        user_id = extract_user_from_magic_token(token)
        return render_error("Invalid or expired token", :unauthorized) unless user_id

        stored_token = retrieve_magic_token(user_id)
        return render_error("Token expired or not found", :unauthorized) unless stored_token
        
        unless ActiveSupport::SecurityUtils.secure_compare(token, stored_token)
          return render_error("Invalid token", :unauthorized)
        end

        user = User.find(user_id)
        clear_magic_token(user_id)
        
        auth_token = generate_emergency_auth_token(user)
        
        # Log emergency auth usage
        Rails.logger.warn("Emergency magic link authentication used by user #{user.id} (#{user.email})")
        
        render json: {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name
          },
          token: auth_token,
          expires_in: 3600, # 1 hour
          is_emergency_session: true
        }
      rescue => e
        Rails.logger.error("Emergency magic link verification failed: #{e.message}")
        render_error("Service temporarily unavailable", :service_unavailable)
      end

      private

      def check_emergency_bypass_enabled
        unless emergency_bypass_enabled?
          render_error("Emergency authentication is currently disabled", :forbidden)
        end
      end

      def emergency_bypass_enabled?
        # Check feature flag - can be Redis, database, or env var
        Rails.cache.fetch("emergency_auth_bypass_enabled", expires_in: 5.minutes) do
          ENV["EMERGENCY_AUTH_BYPASS_ENABLED"] == "true"
        end
      end

      def rate_limit_requests
        ip = request.remote_ip
        cache_key = "emergency_auth_rate_limit:#{ip}"
        
        requests = Rails.cache.read(cache_key) || 0
        if requests >= 10 # Max 10 requests per hour per IP
          render_error("Rate limit exceeded. Please try again later.", :too_many_requests)
          return
        end
        
        Rails.cache.write(cache_key, requests + 1, expires_in: 1.hour)
      end

      def normalize_phone_number(phone)
        return nil unless phone
        
        # Basic phone normalization - remove non-digits and validate
        cleaned = phone.gsub(/\D/, '')
        return nil if cleaned.length < 10 || cleaned.length > 15
        
        # Add country code if missing (assumes US +1)
        cleaned = "1#{cleaned}" if cleaned.length == 10
        "+#{cleaned}"
      end

      def generate_otp_code
        sprintf("%06d", rand(1000000))
      end

      def generate_magic_token
        "#{SecureRandom.urlsafe_base64(32)}_#{Time.current.to_i}"
      end

      def store_otp(user_id, otp_code)
        Rails.cache.write("emergency_otp:#{user_id}", otp_code, expires_in: 5.minutes)
      end

      def retrieve_otp(user_id)
        Rails.cache.read("emergency_otp:#{user_id}")
      end

      def clear_otp(user_id)
        Rails.cache.delete("emergency_otp:#{user_id}")
      end

      def store_magic_token(user_id, token)
        Rails.cache.write("emergency_magic:#{user_id}", token, expires_in: 15.minutes)
      end

      def retrieve_magic_token(user_id)
        Rails.cache.read("emergency_magic:#{user_id}")
      end

      def clear_magic_token(user_id)
        Rails.cache.delete("emergency_magic:#{user_id}")
      end

      def extract_user_from_magic_token(token)
        # Extract user ID from token format: "base64_timestamp"
        parts = token.split('_')
        return nil unless parts.length == 2
        
        timestamp = parts[1].to_i
        return nil if Time.current.to_i - timestamp > 900 # 15 minutes
        
        # In a real implementation, you'd encode the user_id in the token
        # For now, we'll look it up from cache
        User.joins(:emergency_tokens).where(emergency_tokens: { token: token }).first&.id
      end

      def increment_failed_attempts(user_id)
        cache_key = "emergency_failed_attempts:#{user_id}"
        attempts = Rails.cache.read(cache_key) || 0
        Rails.cache.write(cache_key, attempts + 1, expires_in: 1.hour)
        
        if attempts >= 5
          Rails.logger.warn("Emergency auth: Too many failed attempts for user #{user_id}")
        end
      end

      def clear_failed_attempts(user_id)
        Rails.cache.delete("emergency_failed_attempts:#{user_id}")
      end

      def generate_emergency_auth_token(user)
        payload = {
          user_id: user.id,
          emergency: true,
          exp: 1.hour.from_now.to_i,
          iat: Time.current.to_i
        }
        
        JWT.encode(payload, Rails.application.secret_key_base, 'HS256')
      end

      def send_sms_otp(phone, otp_code)
        # Integration with SMS service (Twilio, AWS SNS, etc.)
        if Rails.env.development?
          Rails.logger.info("SMS OTP for #{phone}: #{otp_code}")
          { success: true }
        else
          # In production, integrate with actual SMS service
          # Example: TwilioService.send_sms(phone, "Your emergency access code: #{otp_code}")
          { success: false, error: "SMS service not configured" }
        end
      end

      def send_magic_link_email(user, token)
        begin
          EmergencyAuthMailer.magic_link(user, token).deliver_now
          { success: true }
        rescue => e
          Rails.logger.error("Failed to send magic link email: #{e.message}")
          { success: false, error: e.message }
        end
      end

      def render_error(message, status)
        render json: { success: false, error: message }, status: status
      end
    end
  end
end