import { useState, useRef, useEffect } from 'react';

type InfoTooltipProps = {
  text: string;
  className?: string;
  size?: 'sm' | 'md';
  align?: 'left' | 'right' | 'center';
};

export default function InfoTooltip({
  text,
  className = '',
  size = 'md',
  align = 'center',
}: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const sizeClasses = size === 'sm' ? 'w-4 h-4 text-[10px]' : 'w-4.5 h-4.5 text-[11px]';

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center align-middle ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        aria-label="Info"
        className={`${sizeClasses} rounded-full inline-flex items-center justify-center font-bold font-mono transition-all cursor-pointer border select-none ${
          isOpen
            ? 'bg-teal-600 text-white border-teal-700 shadow-sm scale-110'
            : 'bg-teal-50 text-teal-700 border-teal-300 hover:bg-teal-600 hover:text-white hover:border-teal-700'
        }`}
      >
        i
      </button>

      {isOpen && (
        <div
          role="tooltip"
          className={`absolute z-50 bottom-full mb-2 ${
            align === 'left' ? 'left-0' : align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2'
          } w-64 sm:w-72 p-3 text-xs leading-relaxed font-normal text-slate-100 bg-slate-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-teal-500/30 animate-fadeIn pointer-events-auto`}
        >
          <div className="flex items-start gap-2">
            <span className="text-teal-400 font-bold shrink-0 mt-0.5">ℹ️</span>
            <div className="text-[11.5px] text-slate-200 font-medium leading-snug">{text}</div>
          </div>
          <div
            className={`absolute top-full ${
              align === 'left' ? 'left-3' : align === 'right' ? 'right-3' : 'left-1/2 -translate-x-1/2'
            } -mt-[1px] border-solid border-t-slate-900 border-t-6 border-x-transparent border-x-6 border-b-0 w-0 h-0`}
          />
        </div>
      )}
    </div>
  );
}
