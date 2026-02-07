# frozen_string_literal: true

class IdeaInsight < ApplicationRecord
  # Associations
  belongs_to :idea
  belongs_to :insight

  # Validations
  validates :idea_id, uniqueness: { scope: :insight_id }

  # Scopes
  scope :by_address_level, -> { order(address_level: :desc) }
  scope :fully_addresses, -> { where("address_level >= ?", 3) }

  def address_label
    case address_level
    when 4.. then "Fully Addresses"
    when 3 then "Mostly Addresses"
    when 2 then "Partially Addresses"
    when 1 then "Slightly Addresses"
    else "Tangentially Related"
    end
  end
end
