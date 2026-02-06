require 'rails_helper'

RSpec.describe 'Webhooks::Slack', type: :request do
  describe 'POST /webhooks/slack' do
    context 'URL verification challenge' do
      it 'responds with the challenge' do
        payload = { type: 'url_verification', challenge: 'test-challenge-123' }.to_json

        post '/webhooks/slack', params: payload, headers: { 'Content-Type' => 'application/json' }

        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body)['challenge']).to eq('test-challenge-123')
      end
    end

    context 'message event' do
      let(:message_payload) do
        {
          type: 'event_callback',
          event: {
            type: 'message',
            text: 'We have a bug with the login feature',
            user: 'U123ABC',
            channel: 'C456DEF',
            ts: '1234567890.123456'
          }
        }.to_json
      end

      it 'creates feedback from messages containing feedback keywords' do
        expect {
          post '/webhooks/slack', params: message_payload, headers: { 'Content-Type' => 'application/json' }
        }.to change(Feedback, :count).by(1)

        expect(response).to have_http_status(:ok)

        feedback = Feedback.last
        expect(feedback.source).to eq('slack')
        expect(feedback.content).to include('bug')
      end

      it 'ignores bot messages' do
        bot_payload = {
          type: 'event_callback',
          event: {
            type: 'message',
            text: 'This is from a bot',
            bot_id: 'B123ABC',
            channel: 'C456DEF',
            ts: '1234567890.123456'
          }
        }.to_json

        expect {
          post '/webhooks/slack', params: bot_payload, headers: { 'Content-Type' => 'application/json' }
        }.not_to change(Feedback, :count)
      end

      it 'ignores messages without feedback keywords' do
        normal_payload = {
          type: 'event_callback',
          event: {
            type: 'message',
            text: 'Hello everyone!',
            user: 'U123ABC',
            channel: 'C456DEF',
            ts: '1234567890.123456'
          }
        }.to_json

        expect {
          post '/webhooks/slack', params: normal_payload, headers: { 'Content-Type' => 'application/json' }
        }.not_to change(Feedback, :count)
      end
    end
  end
end
