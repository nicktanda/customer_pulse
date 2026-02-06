FactoryBot.define do
  factory :pulse_report do
    period_start { 24.hours.ago }
    period_end { Time.current }
    feedback_count { 10 }
    recipient_count { 0 }
    summary { Faker::Lorem.paragraph }

    trait :sent do
      sent_at { Time.current }
      recipient_count { 5 }
    end
  end
end
