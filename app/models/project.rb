# frozen_string_literal: true

class Project < ApplicationRecord
  # Associations
  has_many :project_users, dependent: :destroy
  has_many :users, through: :project_users

  has_many :feedbacks, dependent: :destroy
  has_many :integrations, dependent: :destroy
  has_many :insights, dependent: :destroy
  has_many :ideas, dependent: :destroy
  has_many :themes, dependent: :destroy
  has_many :stakeholder_segments, dependent: :destroy
  has_many :pm_personas, dependent: :destroy
  has_many :pulse_reports, dependent: :destroy
  has_many :email_recipients, dependent: :destroy

  # Validations
  validates :name, presence: true
  validates :slug, presence: true, uniqueness: true, format: { with: /\A[a-z0-9-]+\z/, message: 'can only contain lowercase letters, numbers, and hyphens' }

  # Callbacks
  before_validation :generate_slug, on: :create

  # Scopes
  scope :alphabetical, -> { order(:name) }

  def owners
    project_users.owners.includes(:user).map(&:user)
  end

  def editors
    project_users.editors.includes(:user).map(&:user)
  end

  def viewers
    project_users.viewers.includes(:user).map(&:user)
  end

  def role_for(user)
    project_users.find_by(user: user)&.role
  end

  def user_can_edit?(user)
    pu = project_users.find_by(user: user)
    pu&.can_edit?
  end

  def user_can_manage?(user)
    pu = project_users.find_by(user: user)
    pu&.can_manage_project?
  end

  def add_user(user, role: :viewer, invited_by: nil)
    project_users.find_or_create_by!(user: user) do |pu|
      pu.role = role
      pu.invited_by = invited_by
    end
  end

  def remove_user(user)
    project_users.find_by(user: user)&.destroy
  end

  private

  def generate_slug
    return if slug.present?
    return unless name.present?

    base_slug = name.parameterize
    self.slug = base_slug

    counter = 1
    while Project.exists?(slug: slug)
      self.slug = "#{base_slug}-#{counter}"
      counter += 1
    end
  end
end
