FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "user#{n}@example.com" }
    password { "password123" }
    name { Faker::Name.name }
    role { :viewer }

    trait :admin do
      role { :admin }
    end
  end
end
