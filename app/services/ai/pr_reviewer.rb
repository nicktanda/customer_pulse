# frozen_string_literal: true

module Ai
  class PrReviewer < BaseAnalyzer
    MAX_REVIEW_ATTEMPTS = 2

    SYSTEM_PROMPT = <<~PROMPT
      You are an expert code reviewer analyzing proposed code changes.
      Your job is to identify problems that would break existing functionality or introduce bugs.

      You will receive:
      1. The original idea/feature being implemented
      2. The proposed code changes (with before/after for modifications)
      3. Repository context

      Review the changes for these critical issues:

      BLOCKING ISSUES (must reject):
      - Removed existing functionality (methods, classes, features deleted)
      - Changed enum values that would break existing data
      - Removed imports/dependencies that are still needed
      - Syntax errors or obviously broken code
      - Security vulnerabilities (SQL injection, XSS, etc.)
      - Breaking API contracts (changed method signatures, removed endpoints)

      WARNINGS (note but don't reject):
      - Missing tests for new code
      - Style inconsistencies
      - Missing error handling
      - Opportunities for improvement

      Respond in JSON format:
      {
        "approved": true|false,
        "blocking_issues": [
          {
            "file": "path/to/file",
            "issue": "Description of the blocking problem",
            "suggestion": "How to fix it"
          }
        ],
        "warnings": [
          {
            "file": "path/to/file",
            "issue": "Description of the warning"
          }
        ],
        "summary": "Overall assessment of the changes",
        "fix_instructions": "If not approved, specific instructions for fixing the issues"
      }

      Be strict about blocking issues - it's better to reject and regenerate than to merge broken code.
    PROMPT

    def initialize(integration:)
      super()
      @integration = integration
      @github_client = Integrations::GithubClient.new(integration)
    end

    def review(idea:, changes:, repo_analysis:)
      prompt = build_review_prompt(idea, changes, repo_analysis)
      result = call_claude(prompt, system_prompt: SYSTEM_PROMPT, max_tokens: 4096)

      if result[:error]
        return { approved: false, error: result[:error] }
      end

      {
        approved: result[:approved] == true,
        blocking_issues: result[:blocking_issues] || [],
        warnings: result[:warnings] || [],
        summary: result[:summary],
        fix_instructions: result[:fix_instructions]
      }
    rescue => e
      { approved: false, error: e.message }
    end

    private

    def build_review_prompt(idea, changes, repo_analysis)
      parts = []

      parts << "## Feature Being Implemented"
      parts << "Title: #{idea.title}"
      parts << "Description: #{idea.description}"
      parts << ""

      parts << "## Proposed Code Changes"
      parts << "Review each change carefully."
      parts << ""

      changes.each do |change|
        parts << "### #{change[:action].upcase}: #{change[:path]}"
        parts << "Description: #{change[:description]}"
        parts << ""

        if change[:action] == "modify"
          # Fetch the original file content for comparison
          original = @github_client.fetch_file_content(change[:path])
          if original[:success]
            parts << "#### BEFORE (existing code that MUST be preserved):"
            parts << "```"
            parts << original[:content]
            parts << "```"
            parts << ""
          end
        end

        parts << "#### #{change[:action] == 'modify' ? 'AFTER (proposed change)' : 'NEW FILE'}:"
        parts << "```"
        parts << change[:content]
        parts << "```"
        parts << ""
      end

      parts << "## Repository Context"
      parts << "Primary Language: #{repo_analysis.tech_stack['primary_language']}"
      parts << "Frameworks: #{repo_analysis.tech_stack['frameworks']&.join(', ')}"
      parts << ""

      parts << "Review these changes. Focus especially on whether modifications preserve all existing functionality."

      parts.join("\n")
    end
  end
end
