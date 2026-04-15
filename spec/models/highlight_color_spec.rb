require 'rails_helper'

RSpec.describe HighlightColor, type: :model do
  describe '.valid_color?' do
    it 'returns true for valid colors' do
      expect(HighlightColor.valid_color?('#FFF3CD')).to be true
      expect(HighlightColor.valid_color?('#FF69B4')).to be true
    end

    it 'returns false for invalid colors' do
      expect(HighlightColor.valid_color?('#INVALID')).to be false
      expect(HighlightColor.valid_color?('#123456')).to be false
    end
  end

  describe '.color_name' do
    it 'returns correct color names' do
      expect(HighlightColor.color_name('#FF69B4')).to eq('pink')
      expect(HighlightColor.color_name('#FFF3CD')).to eq('yellow')
    end
  end

  describe '.all_colors' do
    it 'includes hot pink in the color palette' do
      colors = HighlightColor.all_colors
      expect(colors['pink']).to eq('#FF69B4')
      expect(colors.keys).to include('pink')
    end

    it 'returns all expected colors' do
      expected_colors = %w[yellow blue green pink orange purple red]
      expect(HighlightColor.all_colors.keys).to match_array(expected_colors)
    end
  end
end