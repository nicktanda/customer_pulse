# Create default admin user
admin = User.find_or_create_by!(email: 'admin@example.com') do |user|
  user.password = 'password123'
  user.name = 'Admin User'
  user.role = :admin
end
puts "Created admin user: #{admin.email}"

# Create a viewer user
viewer = User.find_or_create_by!(email: 'viewer@example.com') do |user|
  user.password = 'password123'
  user.name = 'Viewer User'
  user.role = :viewer
end
puts "Created viewer user: #{viewer.email}"

# Create sample email recipients
['team@example.com', 'product@example.com', 'support@example.com'].each do |email|
  EmailRecipient.find_or_create_by!(email: email) do |recipient|
    recipient.name = email.split('@').first.titleize
    recipient.active = true
  end
end
puts "Created #{EmailRecipient.count} email recipients"

# Create sample integrations (disabled by default for safety)
Integration.find_or_create_by!(name: 'Linear Production') do |integration|
  integration.source_type = :linear
  integration.enabled = false
  integration.credentials = { api_key: 'YOUR_LINEAR_API_KEY' }.to_json
end

Integration.find_or_create_by!(name: 'Customer Feedback Form') do |integration|
  integration.source_type = :google_forms
  integration.enabled = false
  integration.sync_frequency_minutes = 15
  integration.credentials = { spreadsheet_id: 'YOUR_SPREADSHEET_ID', sheet_name: 'Form Responses 1' }.to_json
end

Integration.find_or_create_by!(name: 'Slack Feedback Channel') do |integration|
  integration.source_type = :slack
  integration.enabled = false
  integration.credentials = { bot_token: 'YOUR_BOT_TOKEN', channels: [] }.to_json
end

# Create a custom API integration with a test key
custom = Integration.find_or_create_by!(name: 'Custom API') do |integration|
  integration.source_type = :custom
  integration.enabled = true
  integration.credentials = { api_key: 'test-api-key-12345' }.to_json
end

# Create Gong integration (disabled by default)
Integration.find_or_create_by!(name: 'Gong Calls') do |integration|
  integration.source_type = :gong
  integration.enabled = false
  integration.sync_frequency_minutes = 30
  integration.credentials = {
    api_key: 'YOUR_GONG_API_KEY',
    api_secret: 'YOUR_GONG_API_SECRET',
    workspace_id: nil,
    call_types: [],
    minimum_duration: 60
  }.to_json
end

# Create Excel Online integration (disabled by default)
Integration.find_or_create_by!(name: 'Excel Online Feedback') do |integration|
  integration.source_type = :excel_online
  integration.enabled = false
  integration.sync_frequency_minutes = 15
  integration.credentials = {
    tenant_id: 'YOUR_TENANT_ID',
    client_id: 'YOUR_CLIENT_ID',
    client_secret: 'YOUR_CLIENT_SECRET',
    workbook_id: 'YOUR_WORKBOOK_ID',
    worksheet_name: 'Sheet1',
    column_mapping: {
      timestamp: 0,
      email: 1,
      title: 2,
      content: 3,
      author_name: 4
    },
    last_synced_row: 1
  }.to_json
end

# Create Jira integration (disabled by default)
Integration.find_or_create_by!(name: 'Jira Feedback') do |integration|
  integration.source_type = :jira
  integration.enabled = false
  integration.sync_frequency_minutes = 15
  integration.credentials = {
    site_url: 'https://your-domain.atlassian.net',
    email: 'your-email@example.com',
    api_token: 'YOUR_JIRA_API_TOKEN',
    project_keys: [],
    issue_types: ['Bug', 'Story', 'Task'],
    jql_filter: nil,
    import_comments: true
  }.to_json
end

puts "Created #{Integration.count} integrations"
puts "Custom API key for testing: test-api-key-12345"

# Create PM Personas
pm_personas = [
  {
    name: "Data-Driven PM",
    archetype: "data_driven",
    description: "Prioritizes quantitative patterns, affected user counts, and statistical significance. Focuses on metrics-backed decisions.",
    system_prompt: <<~PROMPT,
      You are a data-driven product manager analyzing customer feedback. Your approach emphasizes:
      - Quantitative patterns and statistical significance
      - Number of affected users and frequency of issues
      - Measurable impact metrics
      - Trend analysis over time
      - Data-backed prioritization

      When analyzing feedback, focus on:
      1. How many users are affected?
      2. What is the frequency/recurrence of this issue?
      3. Can we quantify the impact?
      4. What trends do the numbers show?
      5. Is this statistically significant or an outlier?
    PROMPT
    priorities: ["user_count", "frequency", "measurable_impact", "statistical_significance"]
  },
  {
    name: "User Advocate PM",
    archetype: "user_advocate",
    description: "Focuses on pain severity, emotional impact, and user frustration. Champions the user experience above all.",
    system_prompt: <<~PROMPT,
      You are a user-advocate product manager analyzing customer feedback. Your approach emphasizes:
      - Pain severity and user frustration levels
      - Emotional impact on users
      - User experience quality
      - Accessibility and inclusivity
      - Voice of the customer

      When analyzing feedback, focus on:
      1. How much pain is this causing users?
      2. What is the emotional impact?
      3. How does this affect the user experience?
      4. Are vulnerable user groups affected?
      5. What are users really asking for beneath the surface?
    PROMPT
    priorities: ["pain_severity", "emotional_impact", "user_experience", "accessibility"]
  },
  {
    name: "Strategic PM",
    archetype: "strategist",
    description: "Connects feedback to business strategy, competitive positioning, and market opportunities.",
    system_prompt: <<~PROMPT,
      You are a strategic product manager analyzing customer feedback. Your approach emphasizes:
      - Alignment with business strategy
      - Competitive positioning
      - Market opportunities and threats
      - Revenue and growth impact
      - Long-term product vision

      When analyzing feedback, focus on:
      1. How does this align with our strategic goals?
      2. What competitive advantage could this provide?
      3. Is there a market opportunity here?
      4. What is the revenue/business impact?
      5. How does this fit the product roadmap vision?
    PROMPT
    priorities: ["strategic_alignment", "competitive_advantage", "market_opportunity", "revenue_impact"]
  },
  {
    name: "Innovator PM",
    archetype: "innovator",
    description: "Looks for opportunities to reimagine solutions and identify unmet needs that could transform the product.",
    system_prompt: <<~PROMPT,
      You are an innovative product manager analyzing customer feedback. Your approach emphasizes:
      - Opportunities to reimagine solutions
      - Unmet and unarticulated needs
      - Disruptive potential
      - Creative problem-solving
      - Future-forward thinking

      When analyzing feedback, focus on:
      1. What unmet need does this reveal?
      2. Could we solve this in a completely different way?
      3. Is there a bigger opportunity hidden here?
      4. What would a 10x solution look like?
      5. How might this transform user behavior?
    PROMPT
    priorities: ["unmet_needs", "innovation_potential", "disruptive_opportunity", "creative_solutions"]
  },
  {
    name: "Pragmatist PM",
    archetype: "pragmatist",
    description: "Focuses on quick wins, implementation feasibility, ROI, and practical solutions that can ship fast.",
    system_prompt: <<~PROMPT,
      You are a pragmatic product manager analyzing customer feedback. Your approach emphasizes:
      - Quick wins and fast impact
      - Implementation feasibility
      - Return on investment
      - Resource efficiency
      - Practical, shippable solutions

      When analyzing feedback, focus on:
      1. What's the fastest path to solving this?
      2. Is this feasible with current resources?
      3. What's the ROI of addressing this?
      4. Can we ship an MVP solution quickly?
      5. What's the simplest solution that works?
    PROMPT
    priorities: ["quick_wins", "feasibility", "roi", "resource_efficiency"]
  }
]

pm_personas.each do |attrs|
  PmPersona.find_or_create_by!(archetype: attrs[:archetype]) do |persona|
    persona.assign_attributes(attrs)
  end
end
puts "Created #{PmPersona.count} PM personas"

# Create sample feedback (only in development)
if Rails.env.development?
  sample_feedbacks = [
    {
      source: :custom,
      title: 'Login page loading slowly',
      content: 'The login page takes over 5 seconds to load. This is affecting user experience significantly.',
      author_name: 'John Smith',
      author_email: 'john@customer.com',
      category: :bug,
      priority: :p2,
      status: :triaged,
      ai_summary: 'Performance issue with login page causing slow load times',
      ai_confidence_score: 0.89,
      ai_processed_at: Time.current
    },
    {
      source: :linear,
      source_external_id: 'LIN-123',
      title: 'Add dark mode support',
      content: 'Many users have requested dark mode for the application. This would help reduce eye strain during night usage.',
      author_name: 'Sarah Johnson',
      author_email: 'sarah@customer.com',
      category: :feature_request,
      priority: :p3,
      status: :new_feedback,
      ai_summary: 'Feature request for dark mode theme option',
      ai_confidence_score: 0.95,
      ai_processed_at: Time.current
    },
    {
      source: :slack,
      source_external_id: 'SLACK-456',
      title: 'Cannot export reports',
      content: 'When I try to export the monthly report as PDF, it fails with an error. This is blocking my workflow!',
      author_name: 'Mike Wilson',
      author_email: 'mike@customer.com',
      category: :bug,
      priority: :p1,
      status: :in_progress,
      ai_summary: 'Critical export functionality broken, blocking user workflow',
      ai_confidence_score: 0.92,
      ai_processed_at: Time.current
    },
    {
      source: :google_forms,
      source_external_id: 'FORM-789',
      title: 'Billing issues',
      content: 'I was charged twice for my subscription this month. Please refund the duplicate charge.',
      author_name: 'Emily Davis',
      author_email: 'emily@customer.com',
      category: :complaint,
      priority: :p1,
      status: :triaged,
      ai_summary: 'Double billing complaint requiring refund',
      ai_confidence_score: 0.97,
      ai_processed_at: Time.current
    },
    {
      source: :custom,
      title: 'Mobile app crashes on startup',
      content: 'After the latest update, the mobile app crashes immediately when I try to open it.',
      author_name: 'Chris Brown',
      author_email: 'chris@customer.com',
      category: :bug,
      priority: :p1,
      status: :new_feedback
    }
  ]

  sample_feedbacks.each do |attrs|
    Feedback.find_or_create_by!(title: attrs[:title]) do |feedback|
      feedback.assign_attributes(attrs)
    end
  end
  puts "Created #{Feedback.count} sample feedback items"
end

puts "\nSeed completed successfully!"
puts "Login with: admin@example.com / password123"
