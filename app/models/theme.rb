# frozen_string_literal: true

class Theme < ApplicationRecord
  # JSON serialization for SQLite compatibility (not needed for PostgreSQL JSONB)
  serialize :metadata, coder: JSON if ENV["SOLID_STACK"] == "true"

  # Associations
  belongs_to :project
  has_many :insight_themes, dependent: :destroy
  has_many :insights, through: :insight_themes

  # Validations
  validates :name, presence: true

  # Scopes
  scope :by_priority, -> { order(priority_score: :desc) }
  scope :recent, -> { order(created_at: :desc) }
  scope :analyzed, -> { where.not(analyzed_at: nil) }

  def update_insight_count!
    update!(insight_count: insights.count)
  end

  def update_priority_score!
    score = insights.sum(:severity) + (affected_users_estimate / 10)
    update!(priority_score: score)
  end
end
