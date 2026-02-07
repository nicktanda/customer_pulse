# frozen_string_literal: true

class Insight < ApplicationRecord
  # Associations
  belongs_to :pm_persona, optional: true

  has_many :feedback_insights, dependent: :destroy
  has_many :feedbacks, through: :feedback_insights

  has_many :insight_themes, dependent: :destroy
  has_many :themes, through: :insight_themes

  has_many :insight_stakeholders, dependent: :destroy
  has_many :stakeholder_segments, through: :insight_stakeholders

  has_many :idea_insights, dependent: :destroy
  has_many :ideas, through: :idea_insights

  # Enums
  enum :insight_type, {
    problem: 0,
    opportunity: 1,
    trend: 2,
    risk: 3,
    user_need: 4
  }

  enum :severity, {
    informational: 0,
    minor: 1,
    moderate: 2,
    major: 3,
    critical: 4
  }

  enum :status, {
    discovered: 0,
    validated: 1,
    in_progress: 2,
    addressed: 3,
    dismissed: 4
  }

  # Validations
  validates :title, presence: true
  validates :description, presence: true
  validates :insight_type, presence: true
  validates :severity, presence: true
  validates :status, presence: true

  # Scopes
  scope :recent, -> { order(discovered_at: :desc) }
  scope :by_severity, -> { order(severity: :desc) }
  scope :actionable, -> { where(status: [:discovered, :validated]) }
  scope :high_severity, -> { where(severity: [:major, :critical]) }
  scope :unthemed, -> { left_joins(:insight_themes).where(insight_themes: { id: nil }) }

  # Instance methods
  def severity_label
    severity.to_s.titleize
  end

  def type_label
    insight_type.to_s.titleize.gsub("_", " ")
  end

  def update_feedback_count!
    update!(feedback_count: feedbacks.count)
  end

  def mark_addressed!
    update!(status: :addressed, addressed_at: Time.current)
  end
end
