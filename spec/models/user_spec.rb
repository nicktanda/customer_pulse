require 'rails_helper'

RSpec.describe User, type: :model do
  describe 'validations' do
    it { should validate_presence_of(:email) }
    it { should validate_presence_of(:name) }
  end

  describe 'enums' do
    it { should define_enum_for(:role).with_values(viewer: 0, admin: 1) }
  end

  describe '#admin?' do
    it 'returns true for admin users' do
      user = build(:user, :admin)
      expect(user.admin?).to be true
    end

    it 'returns false for viewer users' do
      user = build(:user, role: :viewer)
      expect(user.admin?).to be false
    end
  end
end
