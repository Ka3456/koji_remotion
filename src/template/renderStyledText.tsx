import React from "react";

const EMPHASIS_COLOR = "#E53935";

export function renderStyledText(text: string): React.ReactNode {
  if (!text || !text.includes("**")) return text;

  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.includes("**")) {
    const start = remaining.indexOf("**");
    const end = remaining.indexOf("**", start + 2);
    if (end === -1) break;

    if (start > 0) {
      parts.push(remaining.slice(0, start));
    }
    parts.push(
      <span key={key++} style={{ color: EMPHASIS_COLOR, fontWeight: 900 }}>
        {remaining.slice(start + 2, end)}
      </span>
    );
    remaining = remaining.slice(end + 2);
  }

  if (remaining) parts.push(remaining);
  return parts.length > 0 ? <>{parts}</> : text;
}
