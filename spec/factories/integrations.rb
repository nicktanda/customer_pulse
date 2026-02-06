FactoryBot.define do
  factory :integration do
    sequence(:name) { |n| "Integration #{n}" }
    source_type { :custom }
    credentials { { api_key: SecureRandom.hex(16) }.to_json }
    webhook_secret { SecureRandom.hex(32) }
    enabled { true }
    last_synced_at { nil }
    sync_frequency_minutes { 15 }

    trait :linear do
      source_type { :linear }
      credentials { { api_key: "lin_api_#{SecureRandom.hex(16)}" }.to_json }
    end

    trait :google_forms do
      source_type { :google_forms }
      credentials { { spreadsheet_id: "1abc123", sheet_name: "Form Responses 1" }.to_json }
    end

    trait :slack do
      source_type { :slack }
      credentials { { bot_token: "xoxb-#{SecureRandom.hex(16)}", channels: ["C123ABC"] }.to_json }
    end

    trait :disabled do
      enabled { false }
    end

    trait :synced do
      last_synced_at { 5.minutes.ago }
    end
  end
end
