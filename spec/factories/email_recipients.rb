FactoryBot.define do
  factory :email_recipient do
    sequence(:email) { |n| "recipient#{n}@example.com" }
    name { Faker::Name.name }
    active { true }

    trait :inactive do
      active { false }
    end
  end
end
