module Highlightable
  extend ActiveSupport::Concern

  HIGHLIGHT_COLORS = [
    'yellow',
    'green', 
    'blue',
    'purple',
    'pink',
    'orange',
    'red',
    'hot-pink'
  ].freeze

  included do
    validates :highlight_color, inclusion: { in: HIGHLIGHT_COLORS }, allow_nil: true
  end

  def highlight_color_name
    return 'None' if highlight_color.blank?
    
    case highlight_color
    when 'hot-pink'
      'Hot Pink'
    else
      highlight_color.titleize
    end
  end

  def highlighted?
    highlight_color.present?
  end
end