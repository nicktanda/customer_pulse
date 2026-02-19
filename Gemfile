source "https://rubygems.org"

# Bundle edge Rails instead: gem "rails", github: "rails/rails", branch: "main"
gem "rails", "~> 8.0.4"
# The modern asset pipeline for Rails [https://github.com/rails/propshaft]
gem "propshaft"
# Use postgresql as the database for Active Record
gem "pg", "~> 1.1"
# Use the Puma web server [https://github.com/puma/puma]
gem "puma", ">= 5.0"
# Bundle and transpile JavaScript [https://github.com/rails/jsbundling-rails]
gem "jsbundling-rails"
# Hotwire's SPA-like page accelerator [https://turbo.hotwired.dev]
gem "turbo-rails"
# Hotwire's modest JavaScript framework [https://stimulus.hotwired.dev]
gem "stimulus-rails"
# Bundle and process CSS [https://github.com/rails/cssbundling-rails]
gem "cssbundling-rails"
# Build JSON APIs with ease [https://github.com/rails/jbuilder]
gem "jbuilder"

# Windows does not include zoneinfo files, so bundle the tzinfo-data gem
gem "tzinfo-data", platforms: %i[ windows jruby ]

# Reduces boot times through caching; required in config/boot.rb
gem "bootsnap", require: false

# Deploy this application anywhere as a Docker container [https://kamal-deploy.org]
gem "kamal", require: false

# Add HTTP asset caching/compression and X-Sendfile acceleration to Puma [https://github.com/basecamp/thruster/]
gem "thruster", require: false

# Authentication
gem "devise", "~> 5.0"

# Background processing
gem "sidekiq", "~> 7.0"
gem "sidekiq-cron", "~> 2.0"
gem "redis", "~> 5.0"

# AI/Claude API
gem "anthropic", "~> 0.3"
gem "faraday", "~> 2.0"

# Google APIs for Google Forms/Sheets integration
gem "google-apis-sheets_v4", "~> 0.30"
gem "googleauth", "~> 1.8"

# OAuth2 for Excel Online integration
gem "oauth2", "~> 2.0"

# Encryption for credentials
gem "lockbox", "~> 1.3"

# JSON Web Token for API authentication
gem "jwt", "~> 2.8"

# Pagination
gem "pagy", "~> 9.0"

group :development, :test do
  # See https://guides.rubyonrails.org/debugging_rails_applications.html#debugging-with-the-debug-gem
  gem "debug", platforms: %i[ mri windows ], require: "debug/prelude"

  # Static analysis for security vulnerabilities [https://brakemanscanner.org/]
  gem "brakeman", require: false

  # Omakase Ruby styling [https://github.com/rails/rubocop-rails-omakase/]
  gem "rubocop-rails-omakase", require: false

  # Testing
  gem "rspec-rails", "~> 7.0"
  gem "factory_bot_rails", "~> 6.4"
  gem "faker", "~> 3.4"

  # Environment variables
  gem "dotenv-rails", "~> 3.1"
end

group :development do
  # Use console on exceptions pages [https://github.com/rails/web-console]
  gem "web-console"

  # Preview emails in browser
  gem "letter_opener", "~> 1.10"
end

group :test do
  gem "shoulda-matchers", "~> 6.2"
  gem "webmock", "~> 3.23"
  gem "vcr", "~> 6.2"
  gem "simplecov", require: false
end
