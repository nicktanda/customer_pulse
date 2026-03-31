FactoryBot.define do
  factory :project do
    name { Faker::Company.name }
    sequence(:slug) { |n| "project-#{n}" }
    description { Faker::Lorem.paragraph }
  end
end
