class HighlightColor
  COLORS = {
    'yellow' => '#FFF3CD',
    'blue' => '#CCE5FF',
    'green' => '#D4EDDA',
    'pink' => '#FF69B4',
    'orange' => '#FFE4B3',
    'purple' => '#E2D5F1',
    'red' => '#F8D7DA'
  }.freeze

  def self.valid_color?(color_value)
    COLORS.values.include?(color_value)
  end

  def self.color_name(color_value)
    COLORS.key(color_value)
  end

  def self.all_colors
    COLORS
  end
end