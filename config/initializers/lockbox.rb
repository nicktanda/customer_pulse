Lockbox.master_key = ENV["LOCKBOX_MASTER_KEY"] || Rails.application.credentials.lockbox_master_key || SecureRandom.hex(32)
