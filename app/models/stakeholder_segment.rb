# frozen_string_literal: true

class StakeholderSegment < ApplicationRecord
  # Associations
  has_many :insight_stakeholders, dependent: :destroy
  has_many :insights, through: :insight_stakeholders

  # Enums
  enum :segment_type, {
    user_segment: 0,
    internal_team: 1,
    customer_tier: 2,
    use_case_group: 3,
    geographic_region: 4
  }

  # Validations
  validates :name, presence: true

  # Scopes
  scope :by_priority, -> { order(engagement_priority: :desc) }
  scope :by_size, -> { order(size_estimate: :desc) }
  scope :users, -> { where(segment_type: :user_segment) }
  scope :teams, -> { where(segment_type: :internal_team) }

  def priority_label
    case engagement_priority
    when 4.. then "Critical"
    when 3 then "High"
    when 2 then "Medium"
    when 1 then "Low"
    else "Minimal"
    end
  end
end
