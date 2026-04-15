import React from 'react';

const ColorPicker = ({ selectedColor, onColorChange, className = '' }) => {
  const colors = [
    { name: 'Yellow', value: '#FFF176', label: 'Highlight Yellow' },
    { name: 'Green', value: '#81C784', label: 'Highlight Green' },
    { name: 'Blue', value: '#64B5F6', label: 'Highlight Blue' },
    { name: 'Purple', value: '#BA68C8', label: 'Highlight Purple' },
    { name: 'Orange', value: '#FFB74D', label: 'Highlight Orange' },
    { name: 'Pink', value: '#F06292', label: 'Highlight Pink' },
    { name: 'Hot Pink', value: '#FF69B4', label: 'Highlight Hot Pink' }
  ];

  return (
    <div className={`color-picker ${className}`}>
      <div className="color-options">
        {colors.map((color) => (
          <button
            key={color.value}
            className={`color-option ${
              selectedColor === color.value ? 'selected' : ''
            }`}
            style={{ backgroundColor: color.value }}
            onClick={() => onColorChange(color.value)}
            aria-label={color.label}
            title={color.name}
          />
        ))}
      </div>
    </div>
  );
};

export default ColorPicker;