require 'rails_helper'

RSpec.describe 'Webhooks::Linear', type: :request do
  let(:valid_payload) do
    {
      action: 'create',
      data: {
        id: 'lin-123',
        title: 'Bug: Something is broken',
        description: 'Detailed description of the bug',
        priority: 1,
        creator: {
          name: 'John Doe',
          email: 'john@example.com'
        },
        labels: [{ name: 'bug' }]
      }
    }.to_json
  end

  describe 'POST /webhooks/linear' do
    it 'creates a new feedback from issue creation' do
      expect {
        post '/webhooks/linear', params: valid_payload, headers: { 'Content-Type' => 'application/json' }
      }.to change(Feedback, :count).by(1)

      expect(response).to have_http_status(:ok)

      feedback = Feedback.last
      expect(feedback.source).to eq('linear')
      expect(feedback.source_external_id).to eq('lin-123')
      expect(feedback.title).to eq('Bug: Something is broken')
      expect(feedback.category).to eq('bug')
      expect(feedback.priority).to eq('p1')
    end

    it 'updates existing feedback on update action' do
      existing = create(:feedback, source: :linear, source_external_id: 'lin-123', title: 'Old title')

      update_payload = {
        action: 'update',
        data: {
          id: 'lin-123',
          title: 'Updated title',
          description: 'Updated description',
          priority: 2,
          creator: { name: 'John', email: 'john@example.com' },
          labels: []
        }
      }.to_json

      expect {
        post '/webhooks/linear', params: update_payload, headers: { 'Content-Type' => 'application/json' }
      }.not_to change(Feedback, :count)

      expect(response).to have_http_status(:ok)
      expect(existing.reload.title).to eq('Updated title')
    end

    it 'returns error for invalid JSON' do
      post '/webhooks/linear', params: 'invalid', headers: { 'Content-Type' => 'application/json' }
      expect(response).to have_http_status(:bad_request)
    end
  end
end
