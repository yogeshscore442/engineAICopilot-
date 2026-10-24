import React from 'react';

// Escape HTML special chars to prevent XSS
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Renders markdown without dangerouslySetInnerHTML:
// - Parses lines starting with "- " or "* " as bullet points
// - Parses bold syntax **text**
// - Splits paragraphs on blank lines
export function SafeMarkdown({ content, className = '' }: { content: string; className?: string }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];

  const flushList = (keyPrefix: string) => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`${keyPrefix}-ul`} className="list-disc pl-5 my-2 space-y-1">
          {currentList.map((item, idx) => (
            <li key={`${keyPrefix}-li-${idx}`} className="text-slate-800 dark:text-slate-200">
              {renderInlineBold(item)}
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      currentList.push(trimmed.slice(2));
    } else {
      flushList(`flush-${idx}`);
      if (trimmed === '') {
        // Blank line spacer
        elements.push(<div key={`spacer-${idx}`} className="h-2" />);
      } else {
        elements.push(
          <p key={`p-${idx}`} className="my-1 text-slate-800 dark:text-slate-200 leading-relaxed">
            {renderInlineBold(line)}
          </p>
        );
      }
    }
  });

  flushList('final');

  return <div className={`prose-sm max-w-none text-sm ${className}`}>{elements}</div>;
}

// Splits by **bold** tags and produces React elements
function renderInlineBold(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={i} className="font-semibold text-slate-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
