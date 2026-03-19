class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable

  enum :role, { viewer: 0, admin: 1 }

  validates :name, presence: true

  def admin?
    role == "admin"
  end

  def onboarding_completed?
    onboarding_completed_at.present?
  end

  def complete_onboarding!
    update!(
      onboarding_completed_at: Time.current,
      onboarding_current_step: 'complete'
    )
  end

  def update_onboarding_step!(step)
    update!(onboarding_current_step: step)
  end
end
