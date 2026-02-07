# frozen_string_literal: true

class InsightTheme < ApplicationRecord
  # Associations
  belongs_to :insight
  belongs_to :theme

  # Validations
  validates :insight_id, uniqueness: { scope: :theme_id }

  # Scopes
  scope :by_relevance, -> { order(relevance_score: :desc) }

  # Callbacks
  after_create :update_theme_counts
  after_destroy :update_theme_counts

  private

  def update_theme_counts
    theme.update_insight_count!
  end
end
