/**
 * WatermarkLayer
 * Pure visual background watermark layer for discrete physical paper sheets.
 *
 * Sits behind content with zero pointer events or DOM selection interference.
 * Supports diagonal rotated text ("CONFIDENTIAL", "DRAFT", "নমুনা") and custom images.
 */

import React from 'react';
import { WatermarkConfig, RuntimeLayoutVariables } from './headerFooterTypes';
import { RuntimeVariableResolver } from './RuntimeVariableResolver';

export interface WatermarkLayerProps {
  config?: WatermarkConfig;
  text?: string;
  variables?: RuntimeLayoutVariables;
  className?: string;
}

export const WatermarkLayer: React.FC<WatermarkLayerProps> = ({
  config = {},
  text,
  variables,
  className = '',
}) => {
  const rawText = text || config.text;
  const isEnabled = config.enabled !== false && (Boolean(rawText) || Boolean(config.imageUrl));

  if (!isEnabled) return null;

  const resolvedText = variables && rawText
    ? RuntimeVariableResolver.resolve(rawText, variables)
    : rawText || '';

  const opacity = config.opacity !== undefined ? config.opacity : 0.08;
  const rotation = config.rotationAngle !== undefined ? config.rotationAngle : -45;
  const color = config.color || '#0f172a';
  const fontSize = config.fontSizePx || 54;

  return (
    <div
      className={`print-watermark-layer absolute inset-0 pointer-events-none select-none flex items-center justify-center overflow-hidden z-0 ${className}`}
      aria-hidden="true"
      style={{
        zIndex: 0,
        pointerEvents: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {config.imageUrl ? (
        <img
          src={config.imageUrl}
          alt=""
          className="max-w-[70%] max-h-[70%] object-contain"
          style={{
            opacity,
            transform: `rotate(${rotation}deg)`,
          }}
        />
      ) : (
        <div
          className="font-black uppercase tracking-widest text-center whitespace-nowrap leading-none"
          style={{
            color,
            opacity,
            fontSize: `${fontSize}px`,
            transform: `rotate(${rotation}deg)`,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            letterSpacing: '0.15em',
            textShadow: '0 0 1px rgba(0,0,0,0.05)',
          }}
        >
          {resolvedText}
        </div>
      )}
    </div>
  );
};

export default WatermarkLayer;
