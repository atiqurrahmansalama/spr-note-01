import React from 'react';

export default function ChevronIcon({ isOpen = false, className = "w-3.5 h-3.5 text-slate-400" }) {
  return React.createElement(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      fill: 'none',
      viewBox: '0 0 24 24',
      strokeWidth: 2,
      stroke: 'currentColor',
      className: `${className} transition-transform duration-200 ease-in-out shrink-0 ${
        isOpen ? 'rotate-180' : 'rotate-0'
      }`,
    },
    React.createElement('path', {
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      d: 'M19.5 8.25l-7.5 7.5-7.5-7.5',
    })
  );
}