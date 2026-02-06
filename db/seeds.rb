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
puts "Created #{Integration.count} integrations"
puts "Custom API key for testing: test-api-key-12345"

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
