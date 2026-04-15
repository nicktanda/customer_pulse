import React from 'react';
import { cn } from '@/lib/utils';
import { HIGHLIGHT_COLOR_ARRAY } from '@/lib/constants/colors';

interface ColorPickerProps {
  selectedColor?: string;
  onColorChange: (color: string) => void;
  className?: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedColor,
  onColorChange,
  className,
}) => {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {HIGHLIGHT_COLOR_ARRAY.map((color) => (
        <button
          key={color.value}
          type="button"
          className={cn(
            'w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2',
            selectedColor === color.value
              ? 'border-gray-900 ring-2 ring-offset-2 ring-gray-900'
              : 'border-gray-300 hover:border-gray-400',
            // Dynamic focus ring color based on contrast
            color.contrast === '#FFFFFF' ? 'focus:ring-gray-900' : 'focus:ring-blue-500'
          )}
          style={{ backgroundColor: color.value }}
          onClick={() => onColorChange(color.value)}
          aria-label={`Select ${color.name} highlight color`}
          title={color.name}
        />
      ))}
    </div>
  );
};

export type { ColorPickerProps };