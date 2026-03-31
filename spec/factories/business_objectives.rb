FactoryBot.define do
  factory :business_objective do
    association :project
    title { Faker::Company.catch_phrase }
    description { Faker::Lorem.paragraph(sentence_count: 2) }
    objective_type { :revenue }
    priority { :medium }
    status { :active }
    active { true }

    trait :revenue do
      objective_type { :revenue }
      title { "Increase MRR by #{rand(10..50)}%" }
    end

    trait :growth do
      objective_type { :growth }
      title { "Grow user base by #{rand(20..100)}%" }
    end

    trait :retention do
      objective_type { :retention }
      title { "Reduce churn to below #{rand(2..10)}%" }
    end

    trait :efficiency do
      objective_type { :efficiency }
      title { "Improve operational efficiency" }
    end

    trait :market_expansion do
      objective_type { :market_expansion }
      title { "Expand into #{Faker::Address.country} market" }
    end

    trait :critical do
      priority { :critical }
    end

    trait :high_priority do
      priority { :high }
    end

    trait :achieved do
      status { :achieved }
    end

    trait :paused do
      status { :paused }
    end

    trait :with_target_date do
      target_date { rand(30..180).days.from_now.to_date }
    end

    trait :overdue do
      target_date { rand(1..30).days.ago.to_date }
    end

    trait :with_success_metrics do
      success_metrics { "- MRR reaches $100K\n- Customer churn below 5%\n- NPS score above 50" }
    end
  end
end
