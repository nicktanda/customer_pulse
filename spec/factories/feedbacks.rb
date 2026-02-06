FactoryBot.define do
  factory :feedback do
    source { :custom }
    sequence(:source_external_id) { |n| "ext-#{n}" }
    title { Faker::Lorem.sentence(word_count: 5) }
    content { Faker::Lorem.paragraph(sentence_count: 3) }
    author_name { Faker::Name.name }
    author_email { Faker::Internet.email }
    category { :uncategorized }
    priority { :unset }
    status { :new_feedback }
    manually_reviewed { false }
    raw_data { {} }

    trait :bug do
      category { :bug }
      priority { :p2 }
    end

    trait :feature_request do
      category { :feature_request }
      priority { :p3 }
    end

    trait :processed do
      ai_summary { Faker::Lorem.sentence }
      ai_confidence_score { rand(0.7..1.0).round(2) }
      ai_processed_at { Time.current }
    end

    trait :high_priority do
      priority { :p1 }
    end

    trait :from_linear do
      source { :linear }
    end

    trait :from_slack do
      source { :slack }
    end

    trait :from_google_forms do
      source { :google_forms }
    end
  end
end
