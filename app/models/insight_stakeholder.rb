# frozen_string_literal: true

class InsightStakeholder < ApplicationRecord
  # Associations
  belongs_to :insight
  belongs_to :stakeholder_segment

  # Validations
  validates :insight_id, uniqueness: { scope: :stakeholder_segment_id }

  # Scopes
  scope :by_impact, -> { order(impact_level: :desc) }
  scope :high_impact, -> { where("impact_level >= ?", 3) }

  def impact_label
    case impact_level
    when 4.. then "Critical"
    when 3 then "High"
    when 2 then "Medium"
    when 1 then "Low"
    else "Minimal"
    end
  end
end
