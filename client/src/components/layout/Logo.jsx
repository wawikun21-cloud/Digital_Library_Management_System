import React from 'react';

export default function Logo({ variant = 'collapsed' }) {
  const expanded = variant === 'expanded';
  const timing = 'cubic-bezier(0.4, 0, 0.2, 1)';

  return (
    <div
      style={{
        width: '100%',
        height: 40,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <img
        src="/icon.png"
        alt="Lexora"
        style={{
          width: 38,
          height: 38,
          objectFit: 'contain',
          borderRadius: 6,
          flexShrink: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Expand logo — only visible when expanded */}
      <img
        src="/expand-logo.png"
        alt="Lexora logo"
        style={{
          height: 30,
          maxWidth: 150,
          objectFit: 'contain',
          objectPosition: 'left center',
          opacity: expanded ? 1 : 0,
          transform: expanded ? 'translateX(0)' : 'translateX(-6px)',
          transition: `opacity 250ms ${timing}, transform 250ms ${timing}`,
          pointerEvents: 'none',
          // Don't affect layout when collapsed
          width: expanded ? 'auto' : 0,
          marginLeft: expanded ? 0 : -10,
          overflow: 'hidden',
        }}
      />
    </div>
  );
}