require 'rails_helper'

RSpec.describe Integration, type: :model do
  describe 'validations' do
    it { should validate_presence_of(:name) }
    it { should validate_presence_of(:source_type) }
  end

  describe 'enums' do
    it { should define_enum_for(:source_type).with_values(linear: 0, google_forms: 1, slack: 2, custom: 3) }
  end

  describe 'callbacks' do
    it 'generates webhook_secret on create' do
      integration = create(:integration, webhook_secret: nil)
      expect(integration.webhook_secret).to be_present
      expect(integration.webhook_secret.length).to eq(64)
    end
  end

  describe '#parsed_credentials' do
    it 'returns parsed JSON credentials' do
      integration = build(:integration, credentials: '{"api_key": "test123"}')
      expect(integration.parsed_credentials).to eq({ "api_key" => "test123" })
    end

    it 'returns empty hash for invalid JSON' do
      integration = build(:integration, credentials: 'invalid')
      expect(integration.parsed_credentials).to eq({})
    end

    it 'returns empty hash for blank credentials' do
      integration = build(:integration, credentials: nil)
      expect(integration.parsed_credentials).to eq({})
    end
  end

  describe '#update_credentials' do
    it 'converts hash to JSON' do
      integration = build(:integration)
      integration.update_credentials({ api_key: 'new_key' })
      expect(integration.credentials).to eq('{"api_key":"new_key"}')
    end
  end

  describe '#sync_due?' do
    it 'returns true when never synced' do
      integration = build(:integration, last_synced_at: nil)
      expect(integration.sync_due?).to be true
    end

    it 'returns true when sync interval has passed' do
      integration = build(:integration, last_synced_at: 20.minutes.ago, sync_frequency_minutes: 15)
      expect(integration.sync_due?).to be true
    end

    it 'returns false when within sync interval' do
      integration = build(:integration, last_synced_at: 5.minutes.ago, sync_frequency_minutes: 15)
      expect(integration.sync_due?).to be false
    end
  end

  describe '#mark_synced!' do
    it 'updates last_synced_at to current time' do
      integration = create(:integration)
      expect { integration.mark_synced! }.to change { integration.reload.last_synced_at }
    end
  end
end
