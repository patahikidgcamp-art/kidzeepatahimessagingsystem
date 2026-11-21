import React from 'react';

interface FormattedMessageTextProps {
  text: string;
  className?: string;
}

/**
 * Safely parses WhatsApp-style & rich template formatting:
 * - *bold*        -> <strong>
 * - _italic_      -> <em>
 * - __underline__ -> <u>
 * - <u>...</u>    -> <u>
 * - ~strike~      -> <del>
 * - `code`        -> <code>
 */
export const FormattedMessageText: React.FC<FormattedMessageTextProps> = ({
  text,
  className = '',
}) => {
  const renderLine = (line: string, lineIdx: number): React.ReactNode => {
    // Match formatting tokens in priority order without crossing lines
    const tokenRegex =
      /(<u>[\s\S]*?<\/u>|__[^\n_](?:[\s\S]*?[^\s_])?__|\*[^\n*](?:[^\n]*?[^\s*])?\*|_[^\n_](?:[^\n]*?[^\s_])?_|~[^\n~](?:[^\n]*?[^\s~])?~|`[^\n`]+`)/g;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let keyCounter = 0;

    while ((match = tokenRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(line.slice(lastIndex, match.index));
      }

      const full = match[0];
      const key = `${lineIdx}-${keyCounter++}`;

      if (full.toLowerCase().startsWith('<u>') && full.toLowerCase().endsWith('</u>')) {
        parts.push(
          <u key={key} className="underline decoration-2 underline-offset-2">
            {full.slice(3, -4)}
          </u>
        );
      } else if (full.startsWith('__') && full.endsWith('__') && full.length > 4) {
        parts.push(
          <u key={key} className="underline decoration-2 underline-offset-2">
            {full.slice(2, -2)}
          </u>
        );
      } else if (full.startsWith('*') && full.endsWith('*') && full.length > 2) {
        parts.push(
          <strong key={key} className="font-extrabold">
            {full.slice(1, -1)}
          </strong>
        );
      } else if (full.startsWith('_') && full.endsWith('_') && full.length > 2) {
        parts.push(
          <em key={key} className="italic">
            {full.slice(1, -1)}
          </em>
        );
      } else if (full.startsWith('~') && full.endsWith('~') && full.length > 2) {
        parts.push(
          <del key={key} className="line-through opacity-80">
            {full.slice(1, -1)}
          </del>
        );
      } else if (full.startsWith('`') && full.endsWith('`') && full.length > 2) {
        parts.push(
          <code
            key={key}
            className="px-1 py-0.2 rounded bg-black/15 font-mono text-[0.92em]"
          >
            {full.slice(1, -1)}
          </code>
        );
      } else {
        parts.push(full);
      }

      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < line.length) {
      parts.push(line.slice(lastIndex));
    }

    return parts.length > 0 ? parts : line;
  };

  const lines = (text || '').split('\n');

  return (
    <span className={className}>
      {lines.map((line, idx) => (
        <React.Fragment key={idx}>
          {renderLine(line, idx)}
          {idx < lines.length - 1 && '\n'}
        </React.Fragment>
      ))}
    </span>
  );
};
