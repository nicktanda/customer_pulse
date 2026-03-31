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
  has_many :business_objectives, dependent: :destroy

  # Validations
  validates :name, presence: true
  validates :slug, presence: true, uniqueness: true, format: { with: /\A[a-z0-9-]+\z/, message: "can only contain lowercase letters, numbers, and hyphens" }

  # Callbacks
  before_validation :generate_slug, on: :create

  # Scopes
  scope :alphabetical, -> { order(:name) }

  def owner
    project_users.owners.first&.user
  end

  def user_has_access?(user)
    project_users.exists?(user: user)
  end

  def user_can_manage?(user)
    project_users.find_by(user: user)&.can_manage_project?
  end

  def add_user(user, is_owner: false, invited_by: nil)
    project_users.find_or_create_by!(user: user) do |pu|
      pu.is_owner = is_owner
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
