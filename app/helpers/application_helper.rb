module ApplicationHelper
  include Pagy::Frontend

  def category_badge_class(category)
    case category
    when "bug"
      "bg-red-100 text-red-800"
    when "feature_request"
      "bg-blue-100 text-blue-800"
    when "complaint"
      "bg-yellow-100 text-yellow-800"
    else
      "bg-gray-100 text-gray-800"
    end
  end

  def priority_badge_class(priority)
    case priority
    when "p1"
      "bg-red-100 text-red-800"
    when "p2"
      "bg-orange-100 text-orange-800"
    when "p3"
      "bg-blue-100 text-blue-800"
    when "p4"
      "bg-gray-100 text-gray-600"
    else
      "bg-gray-100 text-gray-500"
    end
  end

  def status_badge_class(status)
    case status
    when "new_feedback"
      "bg-green-100 text-green-800"
    when "triaged"
      "bg-blue-100 text-blue-800"
    when "in_progress"
      "bg-yellow-100 text-yellow-800"
    when "resolved"
      "bg-gray-100 text-gray-800"
    when "archived"
      "bg-gray-100 text-gray-500"
    else
      "bg-gray-100 text-gray-600"
    end
  end
end
