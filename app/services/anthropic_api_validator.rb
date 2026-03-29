# frozen_string_literal: true

class AnthropicApiValidator
  def initialize(api_key: nil)
    @api_key = api_key || ENV["ANTHROPIC_API_KEY"]
  end

  def validate
    return { success: false, message: "API key is not configured" } if @api_key.blank?

    client = Anthropic::Client.new(api_key: @api_key)

    response = client.messages(
      model: "claude-sonnet-4-20250514",
      max_tokens: 10,
      messages: [{ role: "user", content: "Say 'ok'" }]
    )

    content = response.dig("content", 0, "text") || response.dig(:content, 0, :text)

    if content.present?
      { success: true, message: "API key is valid and working" }
    else
      { success: false, message: "Unexpected response from API" }
    end
  rescue Faraday::UnauthorizedError => e
    { success: false, message: "Invalid API key" }
  rescue Faraday::TooManyRequestsError => e
    { success: false, message: "Rate limited" }
  rescue Faraday::Error => e
    { success: false, message: "API error: #{e.message}" }
  rescue => e
    { success: false, message: "Connection error: #{e.message}" }
  end
end
