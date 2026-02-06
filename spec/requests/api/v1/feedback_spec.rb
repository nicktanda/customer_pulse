require 'rails_helper'

RSpec.describe 'Api::V1::Feedback', type: :request do
  let(:api_key) { 'test-api-key-123' }
  let!(:integration) do
    create(:integration, source_type: :custom, enabled: true,
           credentials: { api_key: api_key }.to_json)
  end

  describe 'POST /api/v1/feedback' do
    let(:valid_params) do
      {
        title: 'Feature request: Dark mode',
        content: 'Please add dark mode to the app',
        author_name: 'Jane Doe',
        author_email: 'jane@example.com'
      }
    end

    let(:headers) do
      { 'X-API-Key' => api_key, 'Content-Type' => 'application/json' }
    end

    context 'with valid API key' do
      it 'creates feedback successfully' do
        expect {
          post '/api/v1/feedback', params: valid_params.to_json, headers: headers
        }.to change(Feedback, :count).by(1)

        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body)['status']).to eq('ok')

        feedback = Feedback.last
        expect(feedback.source).to eq('custom')
        expect(feedback.title).to eq('Feature request: Dark mode')
        expect(feedback.author_email).to eq('jane@example.com')
      end

      it 'returns the created feedback id' do
        post '/api/v1/feedback', params: valid_params.to_json, headers: headers

        body = JSON.parse(response.body)
        expect(body['id']).to be_present
      end
    end

    context 'without API key' do
      it 'returns unauthorized' do
        post '/api/v1/feedback', params: valid_params.to_json,
             headers: { 'Content-Type' => 'application/json' }

        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'with invalid API key' do
      it 'returns unauthorized' do
        post '/api/v1/feedback', params: valid_params.to_json,
             headers: { 'X-API-Key' => 'invalid-key', 'Content-Type' => 'application/json' }

        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'with disabled integration' do
      before { integration.update!(enabled: false) }

      it 'returns unauthorized' do
        post '/api/v1/feedback', params: valid_params.to_json, headers: headers
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'with invalid params' do
      it 'returns error when content is missing' do
        post '/api/v1/feedback', params: { title: 'Test' }.to_json, headers: headers

        expect(response).to have_http_status(:unprocessable_entity)
        expect(JSON.parse(response.body)['error']).to include("Content can't be blank")
      end
    end
  end
end
