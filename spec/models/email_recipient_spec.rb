require 'rails_helper'

RSpec.describe EmailRecipient, type: :model do
  describe 'validations' do
    subject { build(:email_recipient) }

    it { should validate_presence_of(:email) }
    it { should validate_uniqueness_of(:email) }
    it { should allow_value('test@example.com').for(:email) }
    it { should_not allow_value('invalid').for(:email) }
  end

  describe 'scopes' do
    describe '.active' do
      it 'returns only active recipients' do
        active = create(:email_recipient, active: true)
        inactive = create(:email_recipient, :inactive)

        expect(EmailRecipient.active).to include(active)
        expect(EmailRecipient.active).not_to include(inactive)
      end
    end
  end

  describe '#display_name' do
    it 'returns name when present' do
      recipient = build(:email_recipient, name: 'John Doe')
      expect(recipient.display_name).to eq('John Doe')
    end

    it 'returns email when name is blank' do
      recipient = build(:email_recipient, name: nil, email: 'john@example.com')
      expect(recipient.display_name).to eq('john@example.com')
    end
  end

  describe '#activate!' do
    it 'sets active to true' do
      recipient = create(:email_recipient, :inactive)
      recipient.activate!
      expect(recipient.reload.active).to be true
    end
  end

  describe '#deactivate!' do
    it 'sets active to false' do
      recipient = create(:email_recipient, active: true)
      recipient.deactivate!
      expect(recipient.reload.active).to be false
    end
  end
end
