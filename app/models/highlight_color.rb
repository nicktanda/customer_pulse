class HighlightColor
  COLORS = {
    'yellow' => '#FFF176',
    'green' => '#81C784',
    'blue' => '#64B5F6',
    'purple' => '#BA68C8',
    'orange' => '#FFB74D',
    'pink' => '#F06292',
    'hot_pink' => '#FF69B4'
  }.freeze

  def self.valid_color?(color)
    COLORS.values.include?(color)
  end

  def self.color_name(hex_value)
    COLORS.key(hex_value)
  end

  def self.all_colors
    COLORS
  end
end