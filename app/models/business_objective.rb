# frozen_string_literal: true

class BusinessObjective < ApplicationRecord
  # Associations
  belongs_to :project

  # Enums
  enum :objective_type, {
    revenue: 0,
    growth: 1,
    retention: 2,
    efficiency: 3,
    market_expansion: 4
  }

  enum :priority, {
    low: 0,
    medium: 1,
    high: 2,
    critical: 3
  }

  enum :status, {
    active: 0,
    achieved: 1,
    paused: 2,
    abandoned: 3
  }

  # Validations
  validates :title, presence: true
  validates :objective_type, presence: true
  validates :priority, presence: true
  validates :status, presence: true

  # Scopes
  scope :active_objectives, -> { where(active: true, status: :active) }
  scope :by_priority, -> { order(priority: :desc) }
  scope :upcoming, -> { where("target_date >= ?", Date.current).order(:target_date) }
  scope :overdue, -> { active_objectives.where("target_date < ?", Date.current) }

  # Class methods
  def self.for_ai_context(project:)
    project.business_objectives.active_objectives.by_priority.map do |obj|
      {
        id: obj.id,
        title: obj.title,
        description: obj.description,
        type: obj.objective_type,
        priority: obj.priority,
        success_metrics: obj.success_metrics
      }
    end
  end

  # Instance methods
  def priority_label
    priority.to_s.titleize
  end

  def objective_type_label
    objective_type.to_s.titleize.gsub("_", " ")
  end

  def status_label
    status.to_s.titleize
  end

  def overdue?
    active? && target_date.present? && target_date < Date.current
  end

  def days_until_target
    return nil unless target_date.present?
    (target_date - Date.current).to_i
  end
end
