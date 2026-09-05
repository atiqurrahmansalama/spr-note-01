/**
 * AutoPopulateTriggerButton.jsx
 * Standardized Enterprise Button for triggering the Auto-Populate Engine.
 */

import React from 'react';
import CustomButton from '../CustomButton';
import { SparklesIcon } from '../Icons';

export default function AutoPopulateTriggerButton({
  onClick,
  label = 'Auto-Populate',
  title = 'Automatically generate records using the engine',
  size = 'sm',
  variant = 'sub',
  disabled = false,
  className = '',
}) {
  return (
    <CustomButton
      variant={variant}
      size={size}
      icon={SparklesIcon}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={className}
    >
      {label}
    </CustomButton>
  );
}
