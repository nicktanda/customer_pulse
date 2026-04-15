import React, { useState } from 'react';

const HIGHLIGHT_COLORS = [
  { value: 'yellow', label: 'Yellow', hex: '#FEF3C7' },
  { value: 'green', label: 'Green', hex: '#D1FAE5' },
  { value: 'blue', label: 'Blue', hex: '#DBEAFE' },
  { value: 'purple', label: 'Purple', hex: '#E9D5FF' },
  { value: 'pink', label: 'Pink', hex: '#FCE7F3' },
  { value: 'orange', label: 'Orange', hex: '#FED7AA' },
  { value: 'red', label: 'Red', hex: '#FEE2E2' },
  { value: 'hot-pink', label: 'Hot Pink', hex: '#FF69B4' }
];

const HighlightColorPicker = ({ selectedColor, onColorChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleColorSelect = (color) => {
    onColorChange(color.value);
    setIsOpen(false);
  };

  const clearHighlight = () => {
    onColorChange(null);
    setIsOpen(false);
  };

  const selectedColorData = HIGHLIGHT_COLORS.find(color => color.value === selectedColor);

  return (
    <div className={`highlight-color-picker-container ${className}`}>
      <button
        type="button"
        className="highlight-color-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Choose highlight color"
      >
        <span className="highlight-icon">
          {selectedColorData ? (
            <span 
              className="current-color-indicator"
              style={{ backgroundColor: selectedColorData.hex }}
            />
          ) : (
            <span className="no-highlight-icon">◯</span>
          )}
        </span>
      </button>

      {isOpen && (
        <div className="highlight-color-picker">
          <div className="color-options">
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                className={`highlight-color-option ${color.value} ${
                  selectedColor === color.value ? 'selected' : ''
                }`}
                onClick={() => handleColorSelect(color)}
                aria-label={`Highlight with ${color.label}`}
                title={color.label}
              />
            ))}
          </div>
          
          {selectedColor && (
            <button
              type="button"
              className="clear-highlight-btn"
              onClick={clearHighlight}
            >
              Remove highlight
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default HighlightColorPicker;
export { HIGHLIGHT_COLORS };