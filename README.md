# Customer Pulse

A Rails 7 application that aggregates customer feedback from Linear, Google Forms, Slack, and custom forms into a unified database. An AI agent (Claude) processes feedback to categorize, prioritize, and triage items. A daily email digest ("Customer Pulse") is sent to configured recipients.

## Features

- **Multi-source feedback aggregation**: Linear webhooks, Google Forms polling, Slack events, and custom API
- **AI-powered processing**: Claude API categorizes, prioritizes, and summarizes feedback
- **Daily email digest**: Automated "Customer Pulse" email with summary and highlights
- **Modern UI**: Tailwind CSS + Hotwire (Turbo/Stimulus)
- **Background processing**: Sidekiq + Redis for async jobs
- **Secure**: Devise authentication, encrypted credentials, role-based access

## Tech Stack

- **Framework**: Rails 8.0 with PostgreSQL
- **Background Jobs**: Sidekiq + Redis
- **AI**: Claude API (Anthropic)
- **UI**: Tailwind CSS + Hotwire (Turbo/Stimulus)
- **Auth**: Devise
- **Email**: ActionMailer with Sidekiq
- **Testing**: RSpec + FactoryBot

## Requirements

- Ruby 3.3+
- PostgreSQL 14+
- Redis 7+
- Node.js 18+
- Yarn

## Setup

1. **Clone and install dependencies**:
   ```bash
   cd customer_pulse
   bundle install
   yarn install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up the database**:
   ```bash
   rails db:create db:migrate db:seed
   ```

4. **Start the development server**:
   ```bash
   bin/dev
   ```

5. **Visit the application**:
   Open http://localhost:3000 and log in with:
   - Email: `admin@example.com`
   - Password: `password123`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection URL |
| `REDIS_URL` | Redis connection URL |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key |
| `GOOGLE_CREDENTIALS_JSON` | Google service account credentials (JSON) |
| `SLACK_SIGNING_SECRET` | Slack app signing secret |
| `LINEAR_WEBHOOK_SECRET` | Linear webhook secret |
| `LOCKBOX_MASTER_KEY` | 32-byte hex key for encryption |
| `SECRET_KEY_BASE` | Rails secret key |

## Integrations

### Linear (Webhooks)
1. Create a webhook in Linear pointing to `https://your-domain.com/webhooks/linear`
2. Use the webhook secret from your integration settings

### Google Forms (Polling)
1. Create a Google service account
2. Share your Google Sheet with the service account email
3. Configure the spreadsheet ID and sheet name in integration settings

### Slack (Events API)
1. Create a Slack app with Events API enabled
2. Point event subscriptions to `https://your-domain.com/webhooks/slack`
3. Subscribe to `message.channels` events

### Custom API
Send feedback via POST to `/api/v1/feedback`:
```bash
curl -X POST https://your-domain.com/api/v1/feedback \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"title": "Bug report", "content": "Description...", "author_email": "user@example.com"}'
```

## Background Jobs

Jobs are managed by Sidekiq with the following schedule:

| Job | Schedule | Description |
|-----|----------|-------------|
| `ProcessFeedbackBatchJob` | Every 4 hours | Process unprocessed feedback with AI |
| `SyncGoogleFormsJob` | Every 15 minutes | Sync feedback from Google Sheets |
| `SendDailyPulseJob` | Daily at 9:00 AM | Send Customer Pulse email digest |

Access the Sidekiq dashboard at `/sidekiq` (admin only).

## Testing

Run the test suite:
```bash
bundle exec rspec
```

Run specific tests:
```bash
bundle exec rspec spec/models/
bundle exec rspec spec/requests/
```

## Project Structure

```
app/
├── controllers/
│   ├── dashboard_controller.rb
│   ├── feedback_controller.rb
│   ├── integrations_controller.rb
│   ├── email_recipients_controller.rb
│   ├── settings_controller.rb
│   ├── pulse_reports_controller.rb
│   ├── webhooks/
│   │   ├── linear_controller.rb
│   │   └── slack_controller.rb
│   └── api/v1/
│       └── feedback_controller.rb
├── models/
│   ├── feedback.rb
│   ├── integration.rb
│   ├── email_recipient.rb
│   ├── pulse_report.rb
│   └── user.rb
├── services/
│   ├── ai/
│   │   └── feedback_processor.rb
│   ├── integrations/
│   │   ├── linear_client.rb
│   │   ├── google_forms_client.rb
│   │   └── slack_client.rb
│   └── pulse_generator.rb
├── jobs/
│   ├── process_feedback_batch_job.rb
│   ├── sync_google_forms_job.rb
│   └── send_daily_pulse_job.rb
└── mailers/
    └── pulse_mailer.rb
```

## License

MIT
