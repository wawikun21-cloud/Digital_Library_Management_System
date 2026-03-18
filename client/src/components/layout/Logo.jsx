import React from 'react';

/**
 * Both images are always mounted and stacked on top of each other.
 * We crossfade between them with opacity so there's no hard swap mid-transition.
 */
export default function Logo({ variant = 'collapsed' }) {
  const expanded = variant === 'expanded';

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 40,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {/* Icon — visible when collapsed */}
      <img
        src="/icon.png"
        alt="Lexora"
        style={{
          position: 'absolute',
          left: 0,
          width: 36,
          height: 36,
          objectFit: 'contain',
          borderRadius: 6,
          opacity: expanded ? 0 : 1,
          transform: expanded ? 'scale(0.85)' : 'scale(1)',
          transition: 'opacity 250ms ease, transform 250ms ease',
          pointerEvents: 'none',
        }}
      />

      {/* Full logo — visible when expanded */}
      <img
        src="/sidebar-logo.png"
        alt="Lexora logo"
        style={{
          position: 'absolute',
          left: 0,
          height: 40,
          maxWidth: 160,
          objectFit: 'contain',
          objectPosition: 'left center',
          opacity: expanded ? 1 : 0,
          transform: expanded ? 'translateX(0)' : 'translateX(-6px)',
          transition: 'opacity 250ms ease, transform 250ms ease',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}