import React from "react";

// Minimal, dependency-free markdown renderer. Server-rendered, no
// dangerouslySetInnerHTML — supports headings, paragraphs, lists, blockquotes,
// rules, and inline **bold** / *italic* / `code` / [links](url). Enough for our
// research blog without pulling remark/rehype into the Workers bundle.

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Order matters: links first, then code, then bold, then italic.
  const pattern =
    /(\[([^\]]+)\]\((https?:\/\/[^)\s]+)\))|(`([^`]+)`)|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const k = `${keyBase}-${i++}`;
    if (m[1]) {
      nodes.push(
        <a key={k} href={m[3]} target="_blank" rel="noreferrer" className="font-medium text-accent-600 underline underline-offset-2 hover:text-accent">
          {m[2]}
        </a>,
      );
    } else if (m[4]) {
      nodes.push(
        <code key={k} className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-[0.85em]">
          {m[5]}
        </code>,
      );
    } else if (m[6]) {
      nodes.push(<strong key={k} className="font-semibold text-ink">{m[7]}</strong>);
    } else if (m[8]) {
      nodes.push(<em key={k}>{m[9]}</em>);
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }
    // Horizontal rule
    if (/^---+\s*$/.test(line)) {
      blocks.push(<hr key={key++} className="my-8 border-line" />);
      i++;
      continue;
    }
    // Headings
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const content = renderInline(h[2], `h${key}`);
      const cls =
        level === 1
          ? "font-display text-3xl font-semibold tracking-tight mt-10 mb-4"
          : level === 2
            ? "font-display text-2xl font-semibold tracking-tight mt-9 mb-3"
            : "font-display text-xl font-semibold mt-7 mb-2";
      blocks.push(React.createElement(`h${level}`, { key: key++, className: cls }, content));
      i++;
      continue;
    }
    // Blockquote (consecutive > lines; keep line breaks within the quote)
    if (line.startsWith(">")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote key={key++} className="my-5 border-l-4 border-accent/40 bg-accent/5 py-2 pl-5 pr-3 italic text-muted">
          {buf.map((ln, idx) => (
            <span key={idx}>
              {renderInline(ln, `q${key}-${idx}`)}
              {idx < buf.length - 1 && <br />}
            </span>
          ))}
        </blockquote>,
      );
      continue;
    }
    // Table (GFM: header row, then a |---|---| separator, then body rows)
    if (line.includes("|") && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1])) {
      const splitRow = (r: string) =>
        r.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim());
      const header = splitRow(lines[i]);
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push(
        <div key={key++} className="my-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line">
                {header.map((c, idx) => (
                  <th key={idx} className="px-3 py-2 text-left font-semibold text-ink">
                    {renderInline(c, `th${key}-${idx}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-b border-line/60">
                  {r.map((c, ci) => (
                    <td key={ci} className="px-3 py-2 text-ink/90">
                      {renderInline(c, `td${key}-${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={key++} className="my-4 list-disc space-y-1.5 pl-6 text-ink/90">
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it, `ul${key}-${idx}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }
    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push(
        <ol key={key++} className="my-4 list-decimal space-y-1.5 pl-6 text-ink/90">
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it, `ol${key}-${idx}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }
    // Paragraph (gather until blank line / block start)
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4})\s/.test(lines[i]) &&
      !lines[i].startsWith(">") &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^---+\s*$/.test(lines[i]) &&
      !(lines[i].includes("|") && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1]))
    ) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++} className="my-4 leading-relaxed text-ink/90">
        {renderInline(buf.join(" "), `p${key}`)}
      </p>,
    );
  }

  return <div className="text-[1.05rem]">{blocks}</div>;
}
