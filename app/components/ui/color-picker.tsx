import React from 'react';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  selectedColor?: string;
  onColorChange: (color: string) => void;
  className?: string;
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: '#FBBF24', contrast: '#1F2937' },
  { name: 'Green', value: '#10B981', contrast: '#FFFFFF' },
  { name: 'Blue', value: '#3B82F6', contrast: '#FFFFFF' },
  { name: 'Purple', value: '#8B5CF6', contrast: '#FFFFFF' },
  { name: 'Orange', value: '#F59E0B', contrast: '#1F2937' },
  { name: 'Red', value: '#EF4444', contrast: '#FFFFFF' },
  { name: 'Hot Pink', value: '#FF69B4', contrast: '#FFFFFF' },
] as const;

export const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedColor,
  onColorChange,
  className,
}) => {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {HIGHLIGHT_COLORS.map((color) => (
        <button
          key={color.value}
          type="button"
          className={cn(
            'w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
            selectedColor === color.value
              ? 'border-gray-900 ring-2 ring-offset-2 ring-gray-900'
              : 'border-gray-300 hover:border-gray-400'
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

export { HIGHLIGHT_COLORS };
export type { ColorPickerProps };