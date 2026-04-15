import React, { useState } from 'react';

const HIGHLIGHT_COLORS = [
  { name: 'yellow', value: '#FFF3CD', label: 'Yellow' },
  { name: 'blue', value: '#CCE5FF', label: 'Blue' },
  { name: 'green', value: '#D4EDDA', label: 'Green' },
  { name: 'pink', value: '#FF69B4', label: 'Hot Pink' },
  { name: 'orange', value: '#FFE4B3', label: 'Orange' },
  { name: 'purple', value: '#E2D5F1', label: 'Purple' },
  { name: 'red', value: '#F8D7DA', label: 'Red' }
];

const ColorPicker = ({ selectedColor, onColorChange }) => {
  const handleColorSelect = (color) => {
    onColorChange(color);
  };

  return (
    <div className="color-picker">
      {HIGHLIGHT_COLORS.map((color) => (
        <button
          key={color.name}
          type="button"
          className={`color-option ${color.name} ${
            selectedColor === color.value ? 'selected' : ''
          }`}
          onClick={() => handleColorSelect(color.value)}
          aria-label={`Select ${color.label} highlight color`}
          title={color.label}
        />
      ))}
    </div>
  );
};

export default ColorPicker;