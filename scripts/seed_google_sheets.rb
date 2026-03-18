# Adds test rows to Google Sheets for testing the integration
# Run with: bin/rails runner scripts/seed_google_sheets.rb
#
# Options:
#   COUNT=10 bin/rails runner scripts/seed_google_sheets.rb  # Add 10 rows (default: 5)
#
# Note: Requires WRITE scope for the service account. The integration uses
# read-only scope, so you may need to grant additional permissions.

require "google/apis/sheets_v4"
require "googleauth"
require "json"

SAMPLE_RESPONSES = [
  { email: "sarah.johnson@example.com", name: "Sarah Johnson", title: "Love the product but need better mobile support", content: "I use your product daily on desktop and it's fantastic. However, the mobile experience is lacking. The buttons are too small and some features are completely missing. Would love to see parity between platforms." },
  { email: "mike.chen@example.com", name: "Mike Chen", title: "Integration with Zapier would be amazing", content: "We use Zapier for all our automations. Having native Zapier integration would let us connect your product to our entire workflow. Currently we're doing manual exports which is tedious." },
  { email: "emma.wilson@example.com", name: "Emma Wilson", title: "Reporting feature is broken", content: "Tried to generate a monthly report but it keeps showing last month's data. Cleared cache, tried different browsers, same issue. This is blocking our board meeting prep." },
  { email: "james.garcia@example.com", name: "James Garcia", title: "Suggestion: Add team collaboration features", content: "Would be great to see real-time collaboration like Google Docs. Right now we have to take turns editing and it creates version conflicts." },
  { email: "lisa.patel@example.com", name: "Lisa Patel", title: "Billing page not loading", content: "Can't access the billing page to update my credit card. Just shows a spinning loader forever. Need to update before my card expires next week." },
  { email: "david.kim@example.com", name: "David Kim", title: "Feature request: Custom branding", content: "For our enterprise plan, we need white-labeling options. Our clients shouldn't see your branding when we share reports with them." },
  { email: "rachel.brown@example.com", name: "Rachel Brown", title: "Great customer support!", content: "Just wanted to say thanks to your support team. They helped me migrate our data and it was seamless. More companies should have support like this." },
  { email: "tom.martinez@example.com", name: "Tom Martinez", title: "API documentation needs examples", content: "The API docs list endpoints but there are no code examples. Took me hours to figure out the authentication flow. Please add examples in Python and JavaScript." },
  { email: "jennifer.lee@example.com", name: "Jennifer Lee", title: "Search is too slow", content: "Searching through our records takes 10+ seconds. We have about 50,000 entries. Competitors handle this size without issues." },
  { email: "chris.taylor@example.com", name: "Chris Taylor", title: "Need offline mode", content: "I travel frequently and often don't have reliable internet. An offline mode that syncs when connection is available would be a game-changer for me." },
  { email: "amanda.white@example.com", name: "Amanda White", title: "Duplicate records appearing", content: "After the latest update, I'm seeing duplicate entries everywhere. Didn't happen before. Is there a way to bulk delete duplicates?" },
  { email: "kevin.nguyen@example.com", name: "Kevin Nguyen", title: "Requesting bulk export options", content: "Need to export all our data for compliance audit. Current export only does 1000 records at a time. With 100k records this will take forever." },
  { email: "michelle.clark@example.com", name: "Michelle Clark", title: "Calendar integration not syncing", content: "Connected my Google Calendar but events aren't showing up. Disconnected and reconnected, still nothing. This feature was the main reason I signed up." },
  { email: "brian.hall@example.com", name: "Brian Hall", title: "Love the new dashboard!", content: "The redesigned dashboard is so much cleaner. Finding everything I need quickly now. One suggestion: add the ability to customize which widgets appear." },
  { email: "stephanie.moore@example.com", name: "Stephanie Moore", title: "Permission system is confusing", content: "Trying to set up roles for my team but the permission system is hard to understand. Need clearer documentation or a simpler interface for this." },
].freeze

class GoogleSheetsSeeder
  def initialize(integration)
    @integration = integration
    @credentials = integration.parsed_credentials
  end

  def seed(count)
    service = build_sheets_service
    spreadsheet_id = @credentials["spreadsheet_id"]
    sheet_name = @credentials["sheet_name"] || "Form Responses 1"

    puts "Verifying spreadsheet access..."
    begin
      spreadsheet = service.get_spreadsheet(spreadsheet_id)
      puts "Connected to: #{spreadsheet.properties.title}"
    rescue Google::Apis::ClientError => e
      puts "Error: #{e.message}"
      puts "\nNote: The service account needs WRITE access to append rows."
      puts "Make sure the service account email has Editor access to the spreadsheet."
      return
    end

    puts "Adding #{count} test rows to sheet '#{sheet_name}'..."

    rows = []
    count.times do |i|
      sample = SAMPLE_RESPONSES[i % SAMPLE_RESPONSES.length]
      timestamp = (Time.current - rand(0..72).hours).strftime("%Y-%m-%d %H:%M:%S")

      rows << [
        timestamp,
        sample[:email],
        sample[:title],
        sample[:content],
        sample[:name]
      ]
    end

    range = "#{sheet_name}!A:E"
    value_range = Google::Apis::SheetsV4::ValueRange.new(
      range: range,
      values: rows
    )

    begin
      result = service.append_spreadsheet_value(
        spreadsheet_id,
        range,
        value_range,
        value_input_option: "USER_ENTERED"
      )

      puts "  ✓ Added #{rows.length} rows"
      puts "\nDone! Run 'bin/rails runner scripts/test_integrations.rb' to verify, then sync to pull the data."
    rescue Google::Apis::ClientError => e
      puts "  ✗ Failed to append rows: #{e.message}"

      if e.message.include?("PERMISSION_DENIED") || e.message.include?("forbidden")
        puts "\nThe service account needs write access. Current scope is read-only."
        puts "You may need to:"
        puts "  1. Share the spreadsheet with the service account email (as Editor)"
        puts "  2. Or update the OAuth scope to include write access"
      end
    end
  end

  private

  def build_sheets_service
    service = Google::Apis::SheetsV4::SheetsService.new
    service.authorization = google_authorization
    service
  end

  def google_authorization
    google_creds = @credentials["google_credentials"] || ENV["GOOGLE_CREDENTIALS_JSON"]
    creds_hash = google_creds.is_a?(String) ? JSON.parse(google_creds) : google_creds

    # Use full spreadsheets scope for write access
    Google::Auth::ServiceAccountCredentials.make_creds(
      json_key_io: StringIO.new(creds_hash.to_json),
      scope: "https://www.googleapis.com/auth/spreadsheets"
    )
  end
end

# Main execution
integration = Integration.find_by(source_type: :google_forms, enabled: true)

unless integration
  puts "No enabled Google Forms/Sheets integration found."
  puts "Run 'bin/rails runner scripts/setup_integrations.rb' first."
  exit 1
end

count = (ENV["COUNT"] || 5).to_i
GoogleSheetsSeeder.new(integration).seed(count)
