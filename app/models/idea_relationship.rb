# frozen_string_literal: true

class IdeaRelationship < ApplicationRecord
  # Associations
  belongs_to :idea
  belongs_to :related_idea, class_name: "Idea"

  # Enums
  enum :relationship_type, {
    complementary: 0,
    alternative: 1,
    prerequisite: 2,
    conflicts: 3,
    extends: 4
  }

  # Validations
  validates :idea_id, uniqueness: { scope: :related_idea_id }
  validate :ideas_are_different

  # Scopes
  scope :complementary_pairs, -> { where(relationship_type: :complementary) }
  scope :prerequisites, -> { where(relationship_type: :prerequisite) }
  scope :conflicts, -> { where(relationship_type: :conflicts) }

  def relationship_label
    relationship_type.to_s.titleize
  end

  private

  def ideas_are_different
    return unless idea_id == related_idea_id
    errors.add(:related_idea, "cannot be the same as the idea")
  end
end
