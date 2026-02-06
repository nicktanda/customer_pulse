require 'rails_helper'

RSpec.describe Feedback, type: :model do
  describe 'validations' do
    it { should validate_presence_of(:source) }
    it { should validate_presence_of(:content) }
  end

  describe 'enums' do
    it { should define_enum_for(:source).with_values(linear: 0, google_forms: 1, slack: 2, custom: 3) }
    it { should define_enum_for(:category).with_values(uncategorized: 0, bug: 1, feature_request: 2, complaint: 3) }
    it { should define_enum_for(:priority).with_values(unset: 0, p1: 1, p2: 2, p3: 3, p4: 4) }
    it { should define_enum_for(:status).with_values(new_feedback: 0, triaged: 1, in_progress: 2, resolved: 3, archived: 4) }
  end

  describe 'scopes' do
    describe '.unprocessed' do
      it 'returns feedback without ai_processed_at' do
        processed = create(:feedback, :processed)
        unprocessed = create(:feedback)

        expect(Feedback.unprocessed).to include(unprocessed)
        expect(Feedback.unprocessed).not_to include(processed)
      end
    end

    describe '.high_priority' do
      it 'returns p1 and p2 feedback' do
        p1 = create(:feedback, priority: :p1)
        p2 = create(:feedback, priority: :p2)
        p3 = create(:feedback, priority: :p3)

        result = Feedback.high_priority
        expect(result).to include(p1, p2)
        expect(result).not_to include(p3)
      end
    end

    describe '.in_period' do
      it 'returns feedback within the specified time range' do
        recent = create(:feedback, created_at: 1.hour.ago)
        old = create(:feedback, created_at: 2.days.ago)

        result = Feedback.in_period(24.hours.ago, Time.current)
        expect(result).to include(recent)
        expect(result).not_to include(old)
      end
    end
  end

  describe '#processed?' do
    it 'returns true when ai_processed_at is present' do
      feedback = build(:feedback, :processed)
      expect(feedback.processed?).to be true
    end

    it 'returns false when ai_processed_at is nil' do
      feedback = build(:feedback)
      expect(feedback.processed?).to be false
    end
  end

  describe '#priority_label' do
    it 'returns correct labels' do
      expect(build(:feedback, priority: :p1).priority_label).to eq('Critical')
      expect(build(:feedback, priority: :p2).priority_label).to eq('High')
      expect(build(:feedback, priority: :p3).priority_label).to eq('Medium')
      expect(build(:feedback, priority: :p4).priority_label).to eq('Low')
      expect(build(:feedback, priority: :unset).priority_label).to eq('Unset')
    end
  end

  describe '.find_by_external_id' do
    it 'finds feedback by source and external id' do
      feedback = create(:feedback, source: :linear, source_external_id: 'lin-123')
      expect(Feedback.find_by_external_id('linear', 'lin-123')).to eq(feedback)
    end

    it 'returns nil when not found' do
      expect(Feedback.find_by_external_id('linear', 'nonexistent')).to be_nil
    end
  end
end
