class Feedback < ApplicationRecord
  # Associations
  has_many :feedback_insights, dependent: :destroy
  has_many :insights, through: :feedback_insights

  # Enums
  enum :source, { linear: 0, google_forms: 1, slack: 2, custom: 3, gong: 4, excel_online: 5, jira: 6 }
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
  scope :high_priority, -> { where(priority: [:p1, :p2]) }
  scope :recent, -> { order(created_at: :desc) }
  scope :in_period, ->(start_time, end_time) { where(created_at: start_time..end_time) }
  scope :insight_unprocessed, -> { where(insight_processed_at: nil) }
  scope :insight_processed, -> { where.not(insight_processed_at: nil) }
  scope :ready_for_insights, -> { processed.insight_unprocessed }

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
end
