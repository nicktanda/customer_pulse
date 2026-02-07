# frozen_string_literal: true

class PmPersona < ApplicationRecord
  # Associations
  has_many :insights, dependent: :nullify
  has_many :ideas, dependent: :nullify

  # Validations
  validates :name, presence: true
  validates :archetype, presence: true, uniqueness: true
  validates :system_prompt, presence: true

  # Scopes
  scope :active, -> { where(active: true) }

  # Archetype constants
  ARCHETYPES = %w[data_driven user_advocate strategist innovator pragmatist].freeze

  validates :archetype, inclusion: { in: ARCHETYPES }

  def self.data_driven
    find_by(archetype: "data_driven")
  end

  def self.user_advocate
    find_by(archetype: "user_advocate")
  end

  def self.strategist
    find_by(archetype: "strategist")
  end

  def self.innovator
    find_by(archetype: "innovator")
  end

  def self.pragmatist
    find_by(archetype: "pragmatist")
  end
end
