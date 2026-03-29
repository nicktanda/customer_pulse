# frozen_string_literal: true

class RepoAnalysis < ApplicationRecord
  belongs_to :integration

  validates :commit_sha, presence: true

  scope :recent, -> { order(analyzed_at: :desc) }

  def stale?(max_age: 24.hours)
    return true if analyzed_at.nil?
    analyzed_at < max_age.ago
  end

  def primary_language
    tech_stack.dig("primary_language") || tech_stack[:primary_language]
  end

  def frameworks
    tech_stack.dig("frameworks") || tech_stack[:frameworks] || []
  end

  def file_tree
    structure.dig("file_tree") || structure[:file_tree] || []
  end
end
