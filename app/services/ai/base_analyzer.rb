# frozen_string_literal: true

module Ai
  class BaseAnalyzer
    DEFAULT_MODEL = "claude-sonnet-4-20250514"
    DEFAULT_MAX_TOKENS = 4096

    def initialize(pm_persona: nil)
      @client = Anthropic::Client.new(api_key: ENV["ANTHROPIC_API_KEY"])
      @pm_persona = pm_persona
    end

    protected

    def call_claude(prompt, system_prompt: nil, max_tokens: DEFAULT_MAX_TOKENS)
      effective_system = build_system_prompt(system_prompt)

      response = @client.messages.create(
        model: DEFAULT_MODEL,
        max_tokens: max_tokens,
        system: effective_system,
        messages: [{ role: "user", content: prompt }]
      )

      parse_json_response(response)
    rescue Anthropic::Error => e
      Rails.logger.error("Claude API error: #{e.message}")
      { error: e.message }
    rescue JSON::ParserError => e
      Rails.logger.error("JSON parsing error: #{e.message}")
      { error: "Failed to parse AI response" }
    end

    def build_system_prompt(base_prompt)
      if @pm_persona&.system_prompt.present?
        "#{base_prompt}\n\n#{@pm_persona.system_prompt}"
      else
        base_prompt
      end
    end

    def parse_json_response(response)
      content = response.content.first.text
      json_match = content.match(/\{.*\}/m) || content.match(/\[.*\]/m)

      unless json_match
        Rails.logger.warn("No JSON found in response: #{content[0..200]}")
        return { error: "No JSON found in response" }
      end

      JSON.parse(json_match[0], symbolize_names: true)
    end

    def rate_limit_sleep
      sleep(0.5)
    end

    def batch_items(items, batch_size: 25)
      items.each_slice(batch_size).to_a
    end
  end
end
