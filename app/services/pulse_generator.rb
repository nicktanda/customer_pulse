class PulseGenerator
  def initialize(period_start: 24.hours.ago, period_end: Time.current)
    @period_start = period_start
    @period_end = period_end
  end

  def generate
    feedbacks = Feedback.in_period(@period_start, @period_end)

    report = PulseReport.create!(
      period_start: @period_start,
      period_end: @period_end,
      feedback_count: feedbacks.count,
      summary: generate_summary(feedbacks)
    )

    report
  end

  def generate_summary(feedbacks)
    return "No feedback received during this period." if feedbacks.empty?

    by_category = feedbacks.group(:category).count
    by_priority = feedbacks.group(:priority).count
    by_source = feedbacks.group(:source).count

    p1_count = by_priority["p1"] || 0
    p2_count = by_priority["p2"] || 0

    summary_parts = []
    summary_parts << "Total feedback items: #{feedbacks.count}"

    if p1_count > 0 || p2_count > 0
      summary_parts << "High priority items: #{p1_count + p2_count} (#{p1_count} critical, #{p2_count} high)"
    end

    category_summary = by_category.map { |cat, count| "#{count} #{cat}" }.join(", ")
    summary_parts << "By category: #{category_summary}"

    source_summary = by_source.map { |src, count| "#{count} from #{src}" }.join(", ")
    summary_parts << "By source: #{source_summary}"

    # Generate AI trends summary if there's enough feedback
    if feedbacks.count >= 5
      trends = generate_trends_summary(feedbacks)
      summary_parts << "Trends: #{trends}" if trends.present?
    end

    summary_parts.join("\n")
  end

  private

  def generate_trends_summary(feedbacks)
    processor = Ai::FeedbackProcessor.new
    contents = feedbacks.limit(20).pluck(:content).join("\n---\n")

    # Use Claude to identify common themes
    client = Anthropic::Client.new(api_key: ENV["ANTHROPIC_API_KEY"])

    response = client.messages.create(
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: "Identify 2-3 common themes or patterns in this customer feedback. Be concise (1-2 sentences):\n\n#{contents}"
      }]
    )

    response.content.first.text.strip
  rescue => e
    Rails.logger.error("Failed to generate trends summary: #{e.message}")
    nil
  end
end
