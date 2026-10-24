import type { ReactElement } from 'react';
import type { Flag } from '../types';

interface FlagBadgeProps {
  flag: Flag;
  showIcon?: boolean;
}

export default function FlagBadge({ flag, showIcon = true }: FlagBadgeProps) {
  const config: Record<Flag, { label: string; className: string; icon: ReactElement | null }> = {
    LOW: {
      label: 'LOW',
      className: 'badge-low',
      icon: showIcon ? (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
        </svg>
      ) : null,
    },
    NORMAL: {
      label: 'NORMAL',
      className: 'badge-normal',
      icon: showIcon ? (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      ) : null,
    },
    HIGH: {
      label: 'HIGH',
      className: 'badge-high',
      icon: showIcon ? (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
        </svg>
      ) : null,
    },
    UNKNOWN: {
      label: 'UNKNOWN',
      className: 'badge-unknown',
      icon: showIcon ? (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
      ) : null,
    },
  };

  const c = config[flag];

  return (
    <span className={`${c.className}`}>
      {c.icon}
      {c.label}
    </span>
  );
}