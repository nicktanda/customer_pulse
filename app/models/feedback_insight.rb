# frozen_string_literal: true

class FeedbackInsight < ApplicationRecord
  # Associations
  belongs_to :feedback
  belongs_to :insight

  # Validations
  validates :feedback_id, uniqueness: { scope: :insight_id }

  # Scopes
  scope :by_relevance, -> { order(relevance_score: :desc) }
  scope :high_relevance, -> { where("relevance_score >= ?", 0.7) }
end
