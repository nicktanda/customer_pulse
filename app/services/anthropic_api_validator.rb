# frozen_string_literal: true

class AnthropicApiValidator
  def initialize(api_key: nil, project: nil)
    @api_key = api_key || Integration.anthropic_api_key(project: project)
  end

  def validate
    return { success: false, message: "API key is not configured" } if @api_key.blank?

    client = Anthropic::Client.new(api_key: @api_key)

    response = client.messages.create(
      model: "claude-sonnet-4-20250514",
      max_tokens: 10,
      messages: [{ role: "user", content: "Say 'ok'" }]
    )

    if response.content&.first&.text.present?
      { success: true, message: "API key is valid and working" }
    else
      { success: false, message: "Unexpected response from API" }
    end
  rescue => e
    { success: false, message: "API error: #{e.message}" }
  end
end
