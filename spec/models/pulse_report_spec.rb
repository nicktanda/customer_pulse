require 'rails_helper'

RSpec.describe PulseReport, type: :model do
  describe 'validations' do
    it { should validate_presence_of(:period_start) }
    it { should validate_presence_of(:period_end) }

    it 'validates period_end is after period_start' do
      report = build(:pulse_report, period_start: Time.current, period_end: 1.hour.ago)
      expect(report).not_to be_valid
      expect(report.errors[:period_end]).to include('must be after period start')
    end
  end

  describe 'scopes' do
    describe '.sent' do
      it 'returns only sent reports' do
        sent = create(:pulse_report, :sent)
        pending = create(:pulse_report)

        expect(PulseReport.sent).to include(sent)
        expect(PulseReport.sent).not_to include(pending)
      end
    end
  end

  describe '#sent?' do
    it 'returns true when sent_at is present' do
      report = build(:pulse_report, :sent)
      expect(report.sent?).to be true
    end

    it 'returns false when sent_at is nil' do
      report = build(:pulse_report, sent_at: nil)
      expect(report.sent?).to be false
    end
  end

  describe '#mark_sent!' do
    it 'sets sent_at and recipient_count' do
      report = create(:pulse_report)
      report.mark_sent!(recipient_count: 10)

      report.reload
      expect(report.sent_at).to be_present
      expect(report.recipient_count).to eq(10)
    end
  end

  describe '#feedbacks' do
    it 'returns feedback within the report period' do
      report = create(:pulse_report, period_start: 24.hours.ago, period_end: Time.current)
      recent = create(:feedback, created_at: 1.hour.ago)
      old = create(:feedback, created_at: 2.days.ago)

      expect(report.feedbacks).to include(recent)
      expect(report.feedbacks).not_to include(old)
    end
  end
end
