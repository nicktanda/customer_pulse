# Test script for Customer Pulse integrations
# Run with: bin/rails runner scripts/test_integrations.rb

puts "Testing integration connections...\n\n"

Integration.enabled.each do |i|
  client_class = case i.source_type
    when 'linear' then Integrations::LinearClient
    when 'google_forms' then Integrations::GoogleFormsClient
    when 'slack' then Integrations::SlackClient
    when 'jira' then Integrations::JiraClient
    when 'custom' then nil
  end

  if client_class
    result = client_class.new(i).test_connection
    status = result[:success] ? "✓" : "✗"
    puts "#{status} #{i.name} (#{i.source_type})"
    puts "  #{result[:message]}"
  else
    puts "- #{i.name} (#{i.source_type}): no test available"
  end
  puts
end
