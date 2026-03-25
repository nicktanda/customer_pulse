# frozen_string_literal: true

class IdeaPullRequest < ApplicationRecord
  belongs_to :idea
  belongs_to :integration

  enum :status, {
    pending: 0,
    open: 1,
    merged: 2,
    closed: 3,
    failed: 4
  }

  validates :branch_name, presence: true, on: :update

  scope :recent, -> { order(created_at: :desc) }
  scope :successful, -> { where(status: [:open, :merged]) }

  def pr_link
    pr_url if pr_url.present?
  end

  def files_summary
    return [] if files_changed.blank?
    files_changed.map { |f| f["path"] || f[:path] }
  end
end
