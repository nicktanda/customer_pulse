class EmailRecipient < ApplicationRecord
  # Validations
  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }

  # Scopes
  scope :active, -> { where(active: true) }
  scope :inactive, -> { where(active: false) }

  def display_name
    name.presence || email
  end

  def activate!
    update!(active: true)
  end

  def deactivate!
    update!(active: false)
  end
end
