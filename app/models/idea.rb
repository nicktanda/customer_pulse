# frozen_string_literal: true

class Idea < ApplicationRecord
  # Associations
  belongs_to :pm_persona, optional: true

  has_many :idea_insights, dependent: :destroy
  has_many :insights, through: :idea_insights

  has_many :idea_relationships, dependent: :destroy
  has_many :related_ideas, through: :idea_relationships, source: :related_idea

  has_many :inverse_idea_relationships, class_name: "IdeaRelationship",
           foreign_key: :related_idea_id, dependent: :destroy

  # Enums
  enum :idea_type, {
    quick_win: 0,
    feature: 1,
    improvement: 2,
    process_change: 3,
    investigation: 4
  }

  enum :effort_estimate, {
    trivial: 0,
    small: 1,
    medium: 2,
    large: 3,
    extra_large: 4
  }

  enum :impact_estimate, {
    minimal: 0,
    low: 1,
    moderate: 2,
    high: 3,
    transformational: 4
  }

  enum :status, {
    proposed: 0,
    under_review: 1,
    approved: 2,
    in_development: 3,
    completed: 4,
    rejected: 5
  }

  # Validations
  validates :title, presence: true
  validates :description, presence: true

  # Scopes
  scope :by_impact, -> { order(impact_estimate: :desc) }
  scope :by_effort, -> { order(effort_estimate: :asc) }
  scope :quick_wins, -> { where(idea_type: :quick_win) }
  scope :high_impact_low_effort, -> {
    where(impact_estimate: [:high, :transformational])
      .where(effort_estimate: [:trivial, :small])
  }
  scope :actionable, -> { where(status: [:proposed, :under_review, :approved]) }

  # Instance methods
  def effort_label
    effort_estimate.to_s.titleize.gsub("_", " ")
  end

  def impact_label
    impact_estimate.to_s.titleize
  end

  def roi_score
    impact_value = Idea.impact_estimates[impact_estimate] || 0
    effort_value = Idea.effort_estimates[effort_estimate] || 1
    return 0 if effort_value.zero?
    (impact_value.to_f / (effort_value + 1) * 100).round
  end
end
