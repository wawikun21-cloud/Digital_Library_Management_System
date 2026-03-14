import React from 'react';

const LOGO_SIZES = {
  collapsed: { src: '/icon.png', alt: 'Lexora', className: 'w-9 h-9 object-contain rounded-md shrink-0' },
  expanded: { src: '/sidebar-logo.png', alt: 'Lexora logo', className: 'h-10 max-w-[160px] w-full object-contain object-left shrink-0' }
};

export default function Logo({ variant = 'collapsed' }) {
  const logo = LOGO_SIZES[variant];
  return <img src={logo.src} alt={logo.alt} className={logo.className} />;
}
