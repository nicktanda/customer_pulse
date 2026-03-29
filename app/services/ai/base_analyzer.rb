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

      Rails.logger.info("Calling Claude with prompt length: #{prompt.length}, max_tokens: #{max_tokens}")

      response = @client.messages.create(
        model: DEFAULT_MODEL,
        max_tokens: max_tokens,
        system: effective_system,
        messages: [{ role: "user", content: prompt }]
      )

      Rails.logger.info("Claude response received, stop_reason: #{response.stop_reason}")

      parse_json_response(response)
    rescue => e
      Rails.logger.error("Claude API error: #{e.class} - #{e.message}")
      { error: e.message }
    end

    def build_system_prompt(base_prompt)
      if @pm_persona&.system_prompt.present?
        "#{base_prompt}\n\n#{@pm_persona.system_prompt}"
      else
        base_prompt
      end
    end

    def parse_json_response(response)
      content = response.content&.first&.text

      unless content
        Rails.logger.error("No content in AI response: #{response.inspect[0..500]}")
        return { error: "No content in response" }
      end

      Rails.logger.info("AI response length: #{content.length} chars")

      # Try to find JSON in the response - handle both objects and arrays
      json_match = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                   content.match(/```\s*([\s\S]*?)\s*```/) ||
                   content.match(/(\{[\s\S]*\})/) ||
                   content.match(/(\[[\s\S]*\])/)

      unless json_match
        Rails.logger.warn("No JSON found in response: #{content[0..500]}")
        return { error: "No JSON found in response" }
      end

      json_str = json_match[1] || json_match[0]

      # Clean up common JSON issues
      json_str = json_str.strip

      # Try to fix truncated JSON by finding the last complete object/array
      json_str = fix_truncated_json(json_str)

      Rails.logger.info("Parsing JSON of length: #{json_str.length}")

      JSON.parse(json_str, symbolize_names: true)
    rescue JSON::ParserError => e
      Rails.logger.error("JSON parse error: #{e.message}")
      Rails.logger.error("JSON content (first 1000 chars): #{json_str[0..1000]}")
      { error: "Failed to parse AI response: #{e.message}" }
    end

    def fix_truncated_json(json_str)
      # Try parsing as-is first
      JSON.parse(json_str)
      json_str
    rescue JSON::ParserError
      # Try to fix common truncation issues
      fixed = json_str.dup

      # Count open/close braces and brackets
      open_braces = fixed.count('{')
      close_braces = fixed.count('}')
      open_brackets = fixed.count('[')
      close_brackets = fixed.count(']')

      # If we have unclosed structures, try to close them
      if open_braces > close_braces || open_brackets > close_brackets
        # Remove any trailing incomplete string/value
        fixed = fixed.sub(/,\s*"[^"]*$/, '')  # Remove trailing incomplete key
        fixed = fixed.sub(/:\s*"[^"]*$/, ': ""')  # Close incomplete string value
        fixed = fixed.sub(/,\s*$/, '')  # Remove trailing comma

        # Add missing closing brackets/braces
        (open_brackets - close_brackets).times { fixed += ']' }
        (open_braces - close_braces).times { fixed += '}' }
      end

      fixed
    end

    def rate_limit_sleep
      sleep(0.5)
    end

    def batch_items(items, batch_size: 25)
      items.each_slice(batch_size).to_a
    end
  end
end
