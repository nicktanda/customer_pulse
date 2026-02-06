require 'rails_helper'

RSpec.describe Ai::FeedbackProcessor do
  let(:feedback) { create(:feedback, content: 'The login button is not working') }
  let(:mock_client) { instance_double(Anthropic::Client) }

  before do
    allow(Anthropic::Client).to receive(:new).and_return(mock_client)
  end

  let(:processor) { described_class.new }

  describe '#process' do
    let(:ai_response) do
      {
        'category' => 'bug',
        'priority' => 'p2',
        'summary' => 'User reports login button malfunction',
        'confidence' => 0.92
      }
    end

    let(:mock_response) do
      double(content: [double(text: ai_response.to_json)])
    end

    before do
      allow(mock_client).to receive_message_chain(:messages, :create).and_return(mock_response)
    end

    it 'updates feedback with AI analysis' do
      result = processor.process(feedback)

      expect(result[:success]).to be true
      feedback.reload
      expect(feedback.category).to eq('bug')
      expect(feedback.priority).to eq('p2')
      expect(feedback.ai_summary).to eq('User reports login button malfunction')
      expect(feedback.ai_confidence_score).to eq(0.92)
      expect(feedback.ai_processed_at).to be_present
    end

    it 'skips already processed feedback' do
      processed_feedback = create(:feedback, :processed)

      expect {
        processor.process(processed_feedback)
      }.not_to change { processed_feedback.reload.ai_processed_at }
    end

    context 'when AI API fails' do
      before do
        allow(mock_client).to receive_message_chain(:messages, :create).and_raise(Anthropic::Error.new('API Error'))
      end

      it 'marks feedback as uncategorized' do
        processor.process(feedback)

        feedback.reload
        expect(feedback.category).to eq('uncategorized')
        expect(feedback.priority).to eq('unset')
        expect(feedback.ai_processed_at).to be_present
      end
    end
  end

  describe '#process_batch' do
    let(:mock_response) do
      double(content: [double(text: { category: 'bug', priority: 'p3', summary: 'Test', confidence: 0.8 }.to_json)])
    end

    before do
      allow(mock_client).to receive_message_chain(:messages, :create).and_return(mock_response)
    end

    it 'processes multiple feedback items' do
      feedbacks = create_list(:feedback, 3)

      results = processor.process_batch(feedbacks)

      expect(results[:processed]).to eq(3)
      expect(results[:failed]).to eq(0)
    end
  end
end
