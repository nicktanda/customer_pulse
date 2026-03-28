# frozen_string_literal: true

class ProjectUser < ApplicationRecord
  # Associations
  belongs_to :project
  belongs_to :user
  belongs_to :invited_by, class_name: 'User', optional: true

  # Validations
  validates :user_id, uniqueness: { scope: :project_id, message: 'is already a member of this project' }

  # Scopes
  scope :owners, -> { where(is_owner: true) }

  def can_manage_project?
    is_owner?
  end
end
