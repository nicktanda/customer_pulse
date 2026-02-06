class PulseReport < ApplicationRecord
  # Validations
  validates :period_start, presence: true
  validates :period_end, presence: true
  validate :period_end_after_start

  # Scopes
  scope :sent, -> { where.not(sent_at: nil) }
  scope :recent, -> { order(created_at: :desc) }

  def sent?
    sent_at.present?
  end

  def mark_sent!(recipient_count:)
    update!(
      sent_at: Time.current,
      recipient_count: recipient_count
    )
  end

  def period_duration
    period_end - period_start
  end

  def feedbacks
    Feedback.in_period(period_start, period_end)
  end

  private

  def period_end_after_start
    return if period_start.blank? || period_end.blank?
    if period_end <= period_start
      errors.add(:period_end, "must be after period start")
    end
  end
end
