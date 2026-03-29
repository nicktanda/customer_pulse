class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable,
         :omniauthable, omniauth_providers: [:google_oauth2]

  # Associations
  has_many :project_users, dependent: :destroy
  has_many :projects, through: :project_users
  has_many :invited_project_users, class_name: 'ProjectUser', foreign_key: :invited_by_id, dependent: :nullify

  enum :role, { viewer: 0, admin: 1 }

  validates :name, presence: true
  validates :password, presence: true, if: :password_required?

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

  # OmniAuth methods
  def self.from_omniauth(auth)
    # First try to find user by provider and uid
    user = find_by(provider: auth.provider, uid: auth.uid)
    return user if user

    # Try to find user by email and link the account
    user = find_by(email: auth.info.email)
    if user
      user.update!(
        provider: auth.provider,
        uid: auth.uid,
        avatar_url: auth.info.image
      )
      return user
    end

    # Create a new user
    create!(
      email: auth.info.email,
      name: auth.info.name,
      provider: auth.provider,
      uid: auth.uid,
      avatar_url: auth.info.image,
      password: Devise.friendly_token[0, 20]
    )
  end

  def oauth_user?
    provider.present? && uid.present?
  end

  private

  def password_required?
    return false if oauth_user? && !password.present?
    super
  end
end
