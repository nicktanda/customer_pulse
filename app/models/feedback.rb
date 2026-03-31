class Feedback < ApplicationRecord
  # JSON serialization for SQLite compatibility (not needed for PostgreSQL JSONB)
  serialize :raw_data, coder: JSON if ENV["SOLID_STACK"] == "true"
  serialize :aligned_objective_ids, coder: JSON if ENV["SOLID_STACK"] == "true"

  # Associations
  belongs_to :project
  has_many :feedback_insights, dependent: :destroy
  has_many :insights, through: :feedback_insights

  # Enums
  enum :source, { linear: 0, google_forms: 1, slack: 2, custom: 3, gong: 4, excel_online: 5, jira: 6, logrocket: 7, fullstory: 8, intercom: 9, zendesk: 10, sentry: 11 }
  enum :category, { uncategorized: 0, bug: 1, feature_request: 2, complaint: 3 }
  enum :priority, { unset: 0, p1: 1, p2: 2, p3: 3, p4: 4 }
  enum :status, { new_feedback: 0, triaged: 1, in_progress: 2, resolved: 3, archived: 4 }

  # Validations
  validates :source, presence: true
  validates :content, presence: true

  # Scopes
  scope :unprocessed, -> { where(ai_processed_at: nil) }
  scope :processed, -> { where.not(ai_processed_at: nil) }
  scope :needs_review, -> { where(manually_reviewed: false) }
  scope :high_priority, -> { where(priority: [ :p1, :p2 ]) }
  scope :recent, -> { order(created_at: :desc) }
  scope :in_period, ->(start_time, end_time) { where(created_at: start_time..end_time) }
  scope :insight_unprocessed, -> { where(insight_processed_at: nil) }
  scope :insight_processed, -> { where.not(insight_processed_at: nil) }
  scope :ready_for_insights, -> { processed.insight_unprocessed }
  scope :highly_aligned, -> { where("objective_alignment_score >= ?", 0.7) }
  scope :low_alignment, -> { where("objective_alignment_score < ?", 0.4) }
  scope :with_alignment, -> { where.not(objective_alignment_score: nil) }

  # Class methods
  def self.find_by_external_id(source, external_id)
    find_by(source: source, source_external_id: external_id)
  end

  # Instance methods
  def processed?
    ai_processed_at.present?
  end

  def priority_label
    case priority
    when "p1" then "Critical"
    when "p2" then "High"
    when "p3" then "Medium"
    when "p4" then "Low"
    else "Unset"
    end
  end

  def category_label
    category.to_s.titleize.gsub("_", " ")
  end

  def source_label
    source.to_s.titleize.gsub("_", " ")
  end

  def alignment_label
    return "Not analyzed" unless objective_alignment_score

    case objective_alignment_score
    when 0.8..1.0 then "Strongly aligned"
    when 0.6...0.8 then "Aligned"
    when 0.4...0.6 then "Neutral"
    when 0.2...0.4 then "Low alignment"
    else "Misaligned"
    end
  end

  def aligned_objectives
    return [] unless aligned_objective_ids.present?
    project.business_objectives.where(id: aligned_objective_ids)
  end
end
