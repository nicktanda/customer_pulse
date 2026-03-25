# frozen_string_literal: true

module Ai
  class CodeGenerator < BaseAnalyzer
    MAX_CONTEXT_FILES = 10
    MAX_FILE_SIZE = 50_000

    SYSTEM_PROMPT = <<~PROMPT
      You are an expert software engineer generating code changes to implement a feature or fix.
      You will receive:
      1. An idea/feature description with implementation hints
      2. Repository analysis (tech stack, structure, conventions)
      3. Sample code files for context

      Generate production-ready code that:
      - Follows the existing codebase patterns and conventions
      - Uses the same libraries/frameworks already in use
      - Includes appropriate error handling
      - Is well-structured and maintainable
      - Includes tests if the codebase has tests

      Respond in JSON format:
      {
        "changes": [
          {
            "path": "relative/path/to/file.ext",
            "action": "create|modify|delete",
            "content": "full file content for create, or null for delete",
            "description": "brief description of this change"
          }
        ],
        "commit_message": "feat: descriptive commit message",
        "pr_title": "Short PR title",
        "pr_description": "Detailed description of changes for the PR body",
        "implementation_notes": "Any notes about the implementation approach"
      }

      Guidelines:
      - Generate complete, runnable code - no placeholders or TODOs
      - Match the existing code style exactly
      - Keep changes focused and minimal
      - For modifications, include the FULL updated file content
      - Use descriptive commit messages following conventional commits
    PROMPT

    def initialize(integration:, pm_persona: nil)
      super(pm_persona: pm_persona)
      @integration = integration
      @github_client = Integrations::GithubClient.new(integration)
    end

    def generate(idea:, repo_analysis:)
      context_files = fetch_context_files(idea, repo_analysis)

      prompt = build_prompt(idea, repo_analysis, context_files)
      result = call_claude(prompt, system_prompt: SYSTEM_PROMPT, max_tokens: 8192)

      if result[:error]
        return { success: false, error: result[:error] }
      end

      {
        success: true,
        changes: result[:changes] || [],
        commit_message: result[:commit_message] || "feat: implement #{idea.title}",
        pr_title: result[:pr_title] || idea.title,
        pr_description: result[:pr_description] || idea.description,
        implementation_notes: result[:implementation_notes]
      }
    rescue => e
      { success: false, error: e.message }
    end

    private

    def build_prompt(idea, repo_analysis, context_files)
      parts = []

      parts << "## Feature/Idea to Implement"
      parts << "Title: #{idea.title}"
      parts << "Description: #{idea.description}"
      parts << "Type: #{idea.idea_type}"
      parts << "Effort Estimate: #{idea.effort_estimate}"

      if idea.implementation_hints.present?
        parts << "\nImplementation Hints:"
        idea.implementation_hints.each { |hint| parts << "- #{hint}" }
      end

      if idea.rationale.present?
        parts << "\nRationale: #{idea.rationale}"
      end

      parts << "\n## Repository Analysis"
      parts << "Primary Language: #{repo_analysis.tech_stack['primary_language']}"
      parts << "Frameworks: #{repo_analysis.tech_stack['frameworks']&.join(', ')}"
      parts << "Has Tests: #{repo_analysis.tech_stack['has_tests']}"
      parts << "Code Style Tools: #{repo_analysis.conventions['code_style']&.join(', ')}"

      parts << "\nSource Directories:"
      (repo_analysis.structure['source_directories'] || []).first(10).each do |dir|
        parts << "- #{dir}"
      end

      if repo_analysis.structure['test_directories'].present?
        parts << "\nTest Directories:"
        repo_analysis.structure['test_directories'].first(5).each do |dir|
          parts << "- #{dir}"
        end
      end

      if context_files.present?
        parts << "\n## Context Files (for reference)"
        context_files.each do |file|
          parts << "\n### #{file[:path]}"
          parts << "```#{file[:language]}"
          parts << file[:content]
          parts << "```"
        end
      end

      parts << "\n## Available Files in Repository"
      (repo_analysis.structure['file_tree'] || []).first(100).each do |path|
        parts << "- #{path}"
      end

      parts << "\nGenerate the code changes needed to implement this feature."

      parts.join("\n")
    end

    def fetch_context_files(idea, repo_analysis)
      files = []
      file_tree = repo_analysis.structure['file_tree'] || []
      primary_language = repo_analysis.tech_stack['primary_language']

      relevant_files = find_relevant_files(idea, file_tree, primary_language)

      relevant_files.first(MAX_CONTEXT_FILES).each do |path|
        result = @github_client.fetch_file_content(path)
        next unless result[:success] && result[:size].to_i < MAX_FILE_SIZE

        files << {
          path: path,
          content: result[:content],
          language: detect_language(path)
        }
      end

      files
    end

    def find_relevant_files(idea, file_tree, primary_language)
      keywords = extract_keywords(idea)
      extension = language_extension(primary_language)

      scored_files = file_tree.map do |path|
        score = 0

        score += 10 if extension && path.end_with?(extension)

        keywords.each do |keyword|
          score += 5 if path.downcase.include?(keyword.downcase)
        end

        score += 3 if path.include?("controller") || path.include?("service")
        score += 2 if path.include?("model") || path.include?("component")

        score -= 5 if path.include?("test") || path.include?("spec")
        score -= 10 if path.include?("vendor") || path.include?("node_modules")

        [path, score]
      end

      scored_files.sort_by { |_, score| -score }.map(&:first)
    end

    def extract_keywords(idea)
      text = "#{idea.title} #{idea.description}".downcase
      text.scan(/\b[a-z]{3,}\b/).uniq - common_words
    end

    def common_words
      %w[the and for with this that from have been will would could should into about more than other some what which their when where how all any]
    end

    def language_extension(language)
      {
        "ruby" => ".rb",
        "python" => ".py",
        "javascript" => ".js",
        "typescript" => ".ts",
        "java" => ".java",
        "go" => ".go",
        "rust" => ".rs",
        "php" => ".php"
      }[language]
    end

    def detect_language(path)
      ext = File.extname(path).downcase
      {
        ".rb" => "ruby",
        ".py" => "python",
        ".js" => "javascript",
        ".ts" => "typescript",
        ".tsx" => "typescript",
        ".jsx" => "javascript",
        ".java" => "java",
        ".go" => "go",
        ".rs" => "rust",
        ".php" => "php",
        ".erb" => "erb",
        ".html" => "html",
        ".css" => "css",
        ".scss" => "scss",
        ".yml" => "yaml",
        ".yaml" => "yaml",
        ".json" => "json"
      }[ext] || ""
    end
  end
end
