# frozen_string_literal: true

class ProjectUser < ApplicationRecord
  # Associations
  belongs_to :project
  belongs_to :user
  belongs_to :invited_by, class_name: 'User', optional: true

  # Enums
  enum :role, { viewer: 0, editor: 1, owner: 2 }

  # Validations
  validates :user_id, uniqueness: { scope: :project_id, message: 'is already a member of this project' }
  validates :role, presence: true

  # Scopes
  scope :owners, -> { where(role: :owner) }
  scope :editors, -> { where(role: :editor) }
  scope :viewers, -> { where(role: :viewer) }

  # Authorization helpers
  def can_view?
    true
  end

  def can_edit?
    editor? || owner?
  end

  def can_manage_integrations?
    editor? || owner?
  end

  def can_invite_users?
    owner?
  end

  def can_manage_project?
    owner?
  end

  def can_delete_project?
    owner?
  end

  def role_label
    role.to_s.titleize
  end
end
