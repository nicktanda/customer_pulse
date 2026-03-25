# frozen_string_literal: true

module Github
  class RepoAnalyzer
    FRAMEWORK_INDICATORS = {
      "rails" => ["Gemfile", "config/routes.rb", "app/controllers"],
      "react" => ["package.json", "src/App.js", "src/App.tsx", "src/index.js"],
      "nextjs" => ["next.config.js", "next.config.mjs", "pages/_app.js", "app/layout.tsx"],
      "vue" => ["vue.config.js", "src/App.vue", "nuxt.config.js"],
      "django" => ["manage.py", "settings.py", "wsgi.py"],
      "fastapi" => ["main.py", "requirements.txt"],
      "express" => ["package.json", "app.js", "server.js"],
      "spring" => ["pom.xml", "build.gradle", "src/main/java"],
      "laravel" => ["composer.json", "artisan", "app/Http/Controllers"],
      "flutter" => ["pubspec.yaml", "lib/main.dart"]
    }.freeze

    LANGUAGE_EXTENSIONS = {
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
      ".swift" => "swift",
      ".kt" => "kotlin",
      ".dart" => "dart",
      ".cs" => "csharp"
    }.freeze

    def initialize(integration)
      @integration = integration
      @client = Integrations::GithubClient.new(integration)
    end

    def analyze(force: false)
      existing = @integration.repo_analyses.recent.first

      if existing && !existing.stale? && !force
        return { success: true, analysis: existing, cached: true }
      end

      tree_result = @client.fetch_repo_tree
      return { success: false, error: tree_result[:error] } unless tree_result[:success]

      file_tree = tree_result[:tree]
      commit_sha = tree_result[:sha]

      tech_stack = detect_tech_stack(file_tree)
      structure = analyze_structure(file_tree)
      conventions = detect_conventions(file_tree)

      analysis = @integration.repo_analyses.create!(
        commit_sha: commit_sha,
        tech_stack: tech_stack,
        structure: structure,
        conventions: conventions,
        analyzed_at: Time.current
      )

      { success: true, analysis: analysis, cached: false }
    rescue => e
      { success: false, error: e.message }
    end

    def detect_tech_stack(file_tree)
      languages = count_languages(file_tree)
      frameworks = detect_frameworks(file_tree)
      primary_language = languages.max_by { |_, count| count }&.first

      {
        primary_language: primary_language,
        languages: languages,
        frameworks: frameworks,
        has_tests: has_tests?(file_tree),
        has_ci: has_ci?(file_tree),
        package_managers: detect_package_managers(file_tree)
      }
    end

    private

    def count_languages(file_tree)
      counts = Hash.new(0)

      file_tree.each do |path|
        ext = File.extname(path).downcase
        language = LANGUAGE_EXTENSIONS[ext]
        counts[language] += 1 if language
      end

      counts.sort_by { |_, v| -v }.to_h
    end

    def detect_frameworks(file_tree)
      detected = []

      FRAMEWORK_INDICATORS.each do |framework, indicators|
        matches = indicators.count { |indicator| file_tree.any? { |f| f.include?(indicator) } }
        detected << framework if matches >= 2 || (matches >= 1 && indicators.size <= 2)
      end

      detected
    end

    def analyze_structure(file_tree)
      directories = file_tree.map { |f| File.dirname(f) }.uniq.reject { |d| d == "." }

      {
        file_tree: file_tree.first(500),
        total_files: file_tree.size,
        directories: directories.first(100),
        source_directories: find_source_directories(directories),
        test_directories: find_test_directories(directories)
      }
    end

    def find_source_directories(directories)
      source_patterns = %w[src app lib source pkg internal cmd]
      directories.select { |d| source_patterns.any? { |p| d.start_with?(p) || d.include?("/#{p}/") } }
    end

    def find_test_directories(directories)
      test_patterns = %w[test tests spec __tests__ _test]
      directories.select { |d| test_patterns.any? { |p| d.include?(p) } }
    end

    def detect_conventions(file_tree)
      {
        has_readme: file_tree.any? { |f| f.downcase.start_with?("readme") },
        has_license: file_tree.any? { |f| f.downcase.start_with?("license") },
        has_contributing: file_tree.any? { |f| f.downcase.include?("contributing") },
        has_changelog: file_tree.any? { |f| f.downcase.include?("changelog") },
        uses_conventional_commits: detect_conventional_commits(file_tree),
        code_style: detect_code_style(file_tree)
      }
    end

    def has_tests?(file_tree)
      test_patterns = %w[_test.rb _spec.rb .test.js .spec.js .test.ts .spec.ts test_ _test.py _test.go]
      file_tree.any? { |f| test_patterns.any? { |p| f.include?(p) } }
    end

    def has_ci?(file_tree)
      ci_files = %w[.github/workflows .circleci .travis.yml Jenkinsfile .gitlab-ci.yml]
      file_tree.any? { |f| ci_files.any? { |ci| f.start_with?(ci) } }
    end

    def detect_package_managers(file_tree)
      managers = []
      managers << "bundler" if file_tree.include?("Gemfile")
      managers << "npm" if file_tree.include?("package.json")
      managers << "yarn" if file_tree.include?("yarn.lock")
      managers << "pip" if file_tree.include?("requirements.txt")
      managers << "poetry" if file_tree.include?("pyproject.toml")
      managers << "composer" if file_tree.include?("composer.json")
      managers << "maven" if file_tree.include?("pom.xml")
      managers << "gradle" if file_tree.include?("build.gradle")
      managers << "cargo" if file_tree.include?("Cargo.toml")
      managers << "go_modules" if file_tree.include?("go.mod")
      managers
    end

    def detect_conventional_commits(_file_tree)
      false
    end

    def detect_code_style(file_tree)
      styles = []
      styles << "rubocop" if file_tree.include?(".rubocop.yml")
      styles << "eslint" if file_tree.any? { |f| f.include?(".eslintrc") }
      styles << "prettier" if file_tree.any? { |f| f.include?(".prettierrc") }
      styles << "black" if file_tree.include?("pyproject.toml")
      styles << "standardjs" if file_tree.include?(".standardrc")
      styles
    end
  end
end
