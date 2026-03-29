# frozen_string_literal: true

module Github
  class PrCreator
    MAX_REVIEW_ATTEMPTS = 3

    def initialize(idea:, integration:, pull_request_id: nil)
      @idea = idea
      @integration = integration
      @client = Integrations::GithubClient.new(integration)
      @pull_request_id = pull_request_id
    end

    STEPS = {
      analyzing: { step: 1, message: "Analyzing repository structure..." },
      generating: { step: 2, message: "Generating code with AI..." },
      reviewing: { step: 3, message: "Reviewing generated code..." },
      creating_branch: { step: 4, message: "Creating branch..." },
      committing: { step: 5, message: "Committing changes..." },
      opening_pr: { step: 6, message: "Opening pull request..." },
      complete: { step: 7, message: "Complete!" }
    }.freeze

    def create
      # Use existing record if provided, otherwise create new one
      pull_request = if @pull_request_id
        pr = IdeaPullRequest.find(@pull_request_id)
        pr.update!(progress_step: 1, progress_message: "Starting PR generation...")
        pr
      else
        @idea.idea_pull_requests.create!(
          integration: @integration,
          status: :pending,
          progress_step: 0,
          progress_message: "Starting PR generation..."
        )
      end

      begin
        # Step 1: Analyze repo
        update_progress(pull_request, :analyzing)
        analysis_result = ensure_repo_analysis
        return failure(pull_request, analysis_result[:error]) unless analysis_result[:success]

        repo_analysis = analysis_result[:analysis]

        # Step 2: Generate code (skip review for now to speed things up)
        update_progress(pull_request, :generating)
        code_result = generate_code(repo_analysis)
        return failure(pull_request, code_result[:error]) unless code_result[:success]

        # Step 4: Create branch
        update_progress(pull_request, :creating_branch)
        branch_name = generate_branch_name
        branch_result = @client.create_branch(branch_name)
        return failure(pull_request, branch_result[:error]) unless branch_result[:success]

        pull_request.update!(branch_name: branch_name)

        # Step 5: Commit changes
        update_progress(pull_request, :committing)
        commit_result = commit_changes(code_result[:changes], branch_name, code_result[:commit_message])
        return failure(pull_request, commit_result[:error]) unless commit_result[:success]

        # Step 6: Open PR
        update_progress(pull_request, :opening_pr)
        pr_result = create_pull_request(
          branch_name: branch_name,
          title: code_result[:pr_title],
          description: code_result[:pr_description]
        )
        return failure(pull_request, pr_result[:error]) unless pr_result[:success]

        # Step 7: Complete
        update_progress(pull_request, :complete)
        pull_request.update!(
          status: :open,
          pr_number: pr_result[:pr_number],
          pr_url: pr_result[:pr_url],
          files_changed: code_result[:changes].map { |c| { path: c[:path], action: c[:action] } }
        )

        schedule_auto_merge(pull_request) if auto_merge_enabled?

        { success: true, pull_request: pull_request }
      rescue => e
        failure(pull_request, e.message)
      end
    end

    def update_progress(pull_request, step_name)
      step_info = STEPS[step_name]
      pull_request.update!(
        progress_step: step_info[:step],
        progress_message: step_info[:message]
      )
    end

    private

    def ensure_repo_analysis
      analyzer = Github::RepoAnalyzer.new(@integration)
      analyzer.analyze
    end

    def generate_and_review_code(repo_analysis, pull_request = nil)
      generator = Ai::CodeGenerator.new(integration: @integration)
      reviewer = Ai::PrReviewer.new(integration: @integration)

      code_result = nil
      fix_instructions = nil
      previous_changes = nil

      MAX_REVIEW_ATTEMPTS.times do |attempt|
        Rails.logger.info("PR generation attempt #{attempt + 1}/#{MAX_REVIEW_ATTEMPTS}")

        # Update progress for generation
        if pull_request
          pull_request.update!(
            progress_step: 2,
            progress_message: "Generating code (attempt #{attempt + 1}/#{MAX_REVIEW_ATTEMPTS})..."
          )
        end

        # Generate code (with fix instructions if this is a retry)
        code_result = generator.generate(
          idea: @idea,
          repo_analysis: repo_analysis,
          fix_instructions: fix_instructions,
          previous_changes: previous_changes
        )

        return code_result unless code_result[:success]

        # Update progress for review
        if pull_request
          pull_request.update!(
            progress_step: 3,
            progress_message: "Reviewing code (attempt #{attempt + 1}/#{MAX_REVIEW_ATTEMPTS})..."
          )
        end

        # Review the generated code
        review_result = reviewer.review(
          idea: @idea,
          changes: code_result[:changes],
          repo_analysis: repo_analysis
        )

        if review_result[:approved]
          Rails.logger.info("PR review passed on attempt #{attempt + 1}")
          if review_result[:warnings].any?
            Rails.logger.info("Review warnings: #{review_result[:warnings].map { |w| w[:issue] }.join(', ')}")
          end
          return code_result
        end

        # Not approved - prepare for retry
        Rails.logger.warn("PR review failed on attempt #{attempt + 1}: #{review_result[:summary]}")
        Rails.logger.warn("Blocking issues: #{review_result[:blocking_issues].map { |i| i[:issue] }.join(', ')}")

        fix_instructions = review_result[:fix_instructions]
        previous_changes = code_result[:changes]

        # On last attempt, fail if still not approved
        if attempt == MAX_REVIEW_ATTEMPTS - 1
          error_details = review_result[:blocking_issues].map do |issue|
            "#{issue[:file]}: #{issue[:issue]}"
          end.join("\n")

          return {
            success: false,
            error: "Code generation failed review after #{MAX_REVIEW_ATTEMPTS} attempts. Issues:\n#{error_details}"
          }
        end
      end

      code_result
    end

    def generate_code(repo_analysis)
      generator = Ai::CodeGenerator.new(integration: @integration)
      generator.generate(idea: @idea, repo_analysis: repo_analysis)
    end

    def generate_branch_name
      slug = @idea.title.parameterize.first(30)
      timestamp = Time.current.strftime("%Y%m%d%H%M%S")
      "customer-pulse/idea-#{@idea.id}-#{slug}-#{timestamp}"
    end

    def commit_changes(changes, branch_name, commit_message)
      # Track files we've already committed to (their SHAs will change)
      committed_files = {}

      changes.each do |change|
        case change[:action]
        when "create", "modify"
          existing_sha = nil
          existing_content = nil

          # Always check if file exists - AI sometimes marks "create" for existing files
          existing = fetch_file_with_fallback(change[:path], branch_name, committed_files)
          if existing[:success]
            existing_sha = existing[:sha]
            existing_content = existing[:content]
            if change[:action] == "create"
              Rails.logger.info("File #{change[:path]} exists but marked as create - treating as modify")
            end
          else
            # File doesn't exist - this is a true create
            Rails.logger.info("File #{change[:path]} not found - creating new file")
          end

          # Safeguard: Check if AI is removing too much code
          if change[:action] == "modify" && existing_content.present?
            validation = validate_modification(existing_content, change[:content], change[:path])
            unless validation[:valid]
              return { success: false, error: validation[:error] }
            end
          end

          result = @client.create_or_update_file(
            change[:path],
            change[:content],
            "#{commit_message}\n\n#{change[:description]}",
            branch: branch_name,
            sha: existing_sha
          )

          return { success: false, error: result[:error] } unless result[:success]

          # Track the new SHA for this file in case we modify it again
          committed_files[change[:path]] = result[:commit_sha]

        when "delete"
          Rails.logger.info("Skipping delete action for #{change[:path]} - not implemented")
        end
      end

      { success: true }
    rescue => e
      { success: false, error: e.message }
    end

    def fetch_file_with_fallback(path, branch_name, committed_files)
      # If we already committed to this file, we need to fetch its new SHA
      # This shouldn't happen in normal flow, but handle it just in case
      if committed_files[path]
        return @client.fetch_file_content(path, ref: branch_name)
      end

      # For a newly created branch, try fetching from the branch first
      result = @client.fetch_file_content(path, ref: branch_name)
      if result[:success]
        Rails.logger.info("Fetched #{path} from branch #{branch_name}, sha: #{result[:sha]}")
        return result
      end

      Rails.logger.info("Failed to fetch #{path} from branch #{branch_name}: #{result[:error]}")

      # If that fails (race condition with branch creation), try the default branch
      # Since the new branch was created from the default branch, the file SHA is the same
      Rails.logger.info("Fetching #{path} from default branch as fallback")
      fallback_result = @client.fetch_file_content(path)

      if fallback_result[:success]
        Rails.logger.info("Fetched #{path} from default branch, sha: #{fallback_result[:sha]}")
      else
        Rails.logger.warn("Failed to fetch #{path} from default branch: #{fallback_result[:error]}")
      end

      fallback_result
    end

    def validate_modification(existing_content, new_content, path)
      # Skip validation for certain file types where large changes are acceptable
      skip_extensions = %w[.css .scss .sass .less .svg .json .lock]
      if skip_extensions.any? { |ext| path.end_with?(ext) }
        Rails.logger.info("Skipping validation for #{path} (allowed file type)")
        return { valid: true }
      end

      existing_lines = existing_content.lines.count
      new_lines = new_content.lines.count

      # If new content has significantly fewer lines, the AI may have removed code
      # Use 50% threshold to be less aggressive
      if new_lines < existing_lines * 0.5
        Rails.logger.warn("Code reduction detected in #{path}: #{existing_lines} -> #{new_lines} lines")
        return {
          valid: false,
          error: "Modification of #{path} would remove #{existing_lines - new_lines} lines (#{((1 - new_lines.to_f / existing_lines) * 100).round}% reduction). This suggests existing code may be incorrectly removed. Aborting to preserve existing functionality."
        }
      end

      # Check if key methods/classes from existing file are preserved (Ruby/Python files)
      if path.end_with?('.rb', '.py')
        existing_methods = existing_content.scan(/def\s+(\w+)/).flatten
        new_methods = new_content.scan(/def\s+(\w+)/).flatten

        removed_methods = existing_methods - new_methods
        if removed_methods.any?
          Rails.logger.warn("Methods removed from #{path}: #{removed_methods.join(', ')}")
          return {
            valid: false,
            error: "Modification of #{path} would remove existing methods: #{removed_methods.join(', ')}. Aborting to preserve existing functionality."
          }
        end
      end

      { valid: true }
    end

    def create_pull_request(branch_name:, title:, description:)
      pr_body = build_pr_body(description)

      @client.create_pull_request(
        title: title,
        body: pr_body,
        head: branch_name
      )
    end

    def build_pr_body(description)
      sections = []

      # Header
      sections << "## Summary"
      sections << description
      sections << ""

      # What this PR does
      sections << "## What This PR Does"
      sections << @idea.description
      sections << ""

      # Why this is important - the rationale
      if @idea.rationale.present?
        sections << "## Why This Is Important"
        sections << @idea.rationale
        sections << ""
      end

      # Customer feedback examples
      feedback_examples = collect_feedback_examples
      if feedback_examples.any?
        sections << "## Customer Feedback Examples"
        sections << "This change is driven by real customer feedback:"
        sections << ""
        feedback_examples.each_with_index do |feedback, index|
          sections << "### Example #{index + 1}"
          sections << "> #{truncate_text(feedback[:content], 500)}"
          sections << ""
          sections << "- **Source:** #{feedback[:source]}"
          sections << "- **Category:** #{feedback[:category]}"
          sections << "- **Priority:** #{feedback[:priority]}"
          sections << ""
        end
      end

      # Related insights
      insights = @idea.insights.limit(5)
      if insights.any?
        sections << "## Related Insights"
        insights.each do |insight|
          sections << "- **#{insight.title}** (#{insight.severity_label} #{insight.type_label})"
          sections << "  #{truncate_text(insight.description, 200)}"
        end
        sections << ""
      end

      # Implementation details
      if @idea.implementation_hints.present? && @idea.implementation_hints.any?
        sections << "## Implementation Approach"
        @idea.implementation_hints.each do |hint|
          sections << "- #{hint}"
        end
        sections << ""
      end

      # Risks
      if @idea.risks.present?
        sections << "## Risks & Considerations"
        sections << @idea.risks
        sections << ""
      end

      # Metadata
      sections << "---"
      sections << ""
      sections << "## Metadata"
      sections << ""
      sections << "| Field | Value |"
      sections << "|-------|-------|"
      sections << "| **Idea** | #{@idea.title} |"
      sections << "| **Type** | #{@idea.idea_type.titleize} |"
      sections << "| **Effort Estimate** | #{@idea.effort_label} |"
      sections << "| **Impact Estimate** | #{@idea.impact_label} |"
      sections << "| **ROI Score** | #{@idea.roi_score} |"
      sections << "| **Feedback Count** | #{feedback_count} |"
      sections << ""

      # Footer
      sections << "---"
      sections << ""
      sections << "🤖 This PR was automatically generated by [Customer Pulse](https://github.com/your-org/customer-pulse) based on analysis of #{feedback_count} pieces of customer feedback."

      sections.join("\n")
    end

    def collect_feedback_examples
      # Get feedback through insights related to this idea
      feedbacks = Feedback
        .joins(insights: :ideas)
        .where(ideas: { id: @idea.id })
        .order(priority: :desc, created_at: :desc)
        .limit(5)
        .distinct

      feedbacks.map do |feedback|
        {
          content: feedback.content,
          source: feedback.source_label,
          category: feedback.category_label,
          priority: feedback.priority_label
        }
      end
    end

    def feedback_count
      @feedback_count ||= Feedback
        .joins(insights: :ideas)
        .where(ideas: { id: @idea.id })
        .distinct
        .count
    end

    def truncate_text(text, max_length)
      return "" if text.blank?
      text.length > max_length ? "#{text[0...max_length]}..." : text
    end

    def auto_merge_enabled?
      settings = Rails.cache.fetch("app_settings", expires_in: 1.hour) { {} }
      settings["github_auto_merge"] == true || settings["github_auto_merge"] == "true"
    end

    def schedule_auto_merge(pull_request)
      GithubAutoMergeJob.perform_in(5.minutes, pull_request.id)
    end

    def failure(pull_request, error_message)
      pull_request.update!(status: :failed, error_message: error_message)
      { success: false, error: error_message, pull_request: pull_request }
    end
  end
end
