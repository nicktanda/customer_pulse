# frozen_string_literal: true

module Integrations
  class ExcelOnlineClient < BaseClient
    GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"
    TOKEN_URL = "https://login.microsoftonline.com/%{tenant_id}/oauth2/v2.0/token"

    def test_connection
      ensure_valid_token!

      workbook_id = credentials["workbook_id"]
      worksheet_name = credentials["worksheet_name"] || "Sheet1"

      response = make_request("/me/drive/items/#{workbook_id}/workbook/worksheets/#{worksheet_name}")

      if response.success?
        data = JSON.parse(response.body)
        { success: true, message: "Connected to worksheet: #{data['name']}" }
      else
        { success: false, message: "Connection failed: #{response.status}" }
      end
    rescue => e
      { success: false, message: e.message }
    end

    def sync
      ensure_valid_token!

      workbook_id = credentials["workbook_id"]
      worksheet_name = credentials["worksheet_name"] || "Sheet1"
      last_row = credentials["last_synced_row"].to_i || 1

      range = "A#{last_row + 1}:Z1000"
      response = make_request(
        "/me/drive/items/#{workbook_id}/workbook/worksheets/#{worksheet_name}/range(address='#{range}')"
      )

      unless response.success?
        return { success: false, message: "Failed to fetch data: #{response.status}" }
      end

      data = JSON.parse(response.body)
      values = data["values"] || []

      values = values.reject { |row| row.all?(&:blank?) }

      return { success: true, created: 0 } if values.empty?

      created_count = 0
      column_mapping = credentials["column_mapping"] || default_column_mapping

      values.each_with_index do |row, index|
        row_number = last_row + index + 1
        external_id = "#{workbook_id}-row-#{row_number}"

        next if Feedback.find_by_external_id("excel_online", external_id)

        feedback_attrs = build_feedback_from_row(row, column_mapping, external_id)
        next if feedback_attrs[:content].blank?

        Feedback.create!(feedback_attrs)
        created_count += 1
      end

      new_credentials = credentials.merge("last_synced_row" => last_row + values.length)
      integration.update_credentials(new_credentials)
      integration.mark_synced!

      { success: true, created: created_count }
    rescue => e
      { success: false, message: e.message }
    end

    private

    def tenant_id
      credentials["tenant_id"]
    end

    def client_id
      credentials["client_id"]
    end

    def client_secret
      credentials["client_secret"]
    end

    def access_token
      credentials["access_token"]
    end

    def refresh_token
      credentials["refresh_token"]
    end

    def token_expires_at
      credentials["token_expires_at"]&.to_i || 0
    end

    def make_request(path, method: :get, body: nil)
      url = "#{GRAPH_BASE_URL}#{path}"

      Faraday.send(method, url) do |req|
        req.headers["Authorization"] = "Bearer #{access_token}"
        req.headers["Content-Type"] = "application/json"
        req.body = body.to_json if body
      end
    end

    def ensure_valid_token!
      return if token_valid?
      refresh_access_token!
    end

    def token_valid?
      access_token.present? && Time.now.to_i < token_expires_at - 60
    end

    def refresh_access_token!
      return unless refresh_token.present?

      url = format(TOKEN_URL, tenant_id: tenant_id)

      response = Faraday.post(url) do |req|
        req.headers["Content-Type"] = "application/x-www-form-urlencoded"
        req.body = URI.encode_www_form(
          client_id: client_id,
          client_secret: client_secret,
          refresh_token: refresh_token,
          grant_type: "refresh_token",
          scope: "https://graph.microsoft.com/.default offline_access"
        )
      end

      unless response.success?
        raise "Token refresh failed: #{response.status}"
      end

      data = JSON.parse(response.body)

      new_credentials = credentials.merge(
        "access_token" => data["access_token"],
        "refresh_token" => data["refresh_token"] || refresh_token,
        "token_expires_at" => Time.now.to_i + data["expires_in"].to_i
      )

      integration.update_credentials(new_credentials)
      integration.save!

      @credentials = nil
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
        source: :excel_online,
        source_external_id: external_id,
        title: row[mapping["title"].to_i] || "Excel Response",
        content: row[mapping["content"].to_i] || row.compact.join("\n"),
        author_name: row[mapping["author_name"].to_i],
        author_email: row[mapping["email"].to_i],
        raw_data: { row: row, mapping: mapping }
      }
    end
  end
end
