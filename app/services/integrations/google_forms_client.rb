module Integrations
  class GoogleFormsClient < BaseClient
    def test_connection
      service = build_sheets_service
      spreadsheet_id = credentials["spreadsheet_id"]

      response = service.get_spreadsheet(spreadsheet_id)
      { success: true, message: "Connected to: #{response.properties.title}" }
    rescue Google::Apis::ClientError => e
      { success: false, message: "Google API error: #{e.message}" }
    rescue => e
      { success: false, message: e.message }
    end

    def sync
      service = build_sheets_service
      spreadsheet_id = credentials["spreadsheet_id"]
      sheet_name = credentials["sheet_name"] || "Form Responses 1"
      last_row = credentials["last_synced_row"].to_i || 1

      range = "#{sheet_name}!A#{last_row + 1}:Z"
      response = service.get_spreadsheet_values(spreadsheet_id, range)

      return { success: true, created: 0 } if response.values.blank?

      created_count = 0
      column_mapping = credentials["column_mapping"] || default_column_mapping

      response.values.each_with_index do |row, index|
        row_number = last_row + index + 1
        external_id = "#{spreadsheet_id}-row-#{row_number}"

        next if Feedback.find_by_external_id("google_forms", external_id)

        feedback_attrs = build_feedback_from_row(row, column_mapping, external_id)
        Feedback.create!(feedback_attrs)
        created_count += 1
      end

      # Update last synced row
      new_credentials = credentials.merge("last_synced_row" => last_row + response.values.length)
      integration.update_credentials(new_credentials)
      integration.mark_synced!

      { success: true, created: created_count }
    rescue Google::Apis::ClientError => e
      { success: false, message: "Google API error: #{e.message}" }
    rescue => e
      { success: false, message: e.message }
    end

    private

    def build_sheets_service
      service = Google::Apis::SheetsV4::SheetsService.new
      service.authorization = google_authorization
      service
    end

    def google_authorization
      google_creds = credentials["google_credentials"] || ENV["GOOGLE_CREDENTIALS_JSON"]
      creds_hash = google_creds.is_a?(String) ? JSON.parse(google_creds) : google_creds

      Google::Auth::ServiceAccountCredentials.make_creds(
        json_key_io: StringIO.new(creds_hash.to_json),
        scope: Google::Apis::SheetsV4::AUTH_SPREADSHEETS_READONLY
      )
    end

    def default_column_mapping
      {
        "timestamp" => 0,
        "email" => 1,
        "title" => 2,
        "content" => 3,
        "author_name" => 4
      }
    end

    def build_feedback_from_row(row, mapping, external_id)
      {
        source: :google_forms,
        source_external_id: external_id,
        title: row[mapping["title"].to_i] || "Form Response",
        content: row[mapping["content"].to_i] || row.join("\n"),
        author_name: row[mapping["author_name"].to_i],
        author_email: row[mapping["email"].to_i],
        raw_data: { row: row, mapping: mapping }
      }
    end
  end
end
