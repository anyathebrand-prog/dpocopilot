import type { ReactNode } from "react";

// Blog post body: a small Markdown subset, written by the Secretary (lib/blog.ts).
// "## " / "### " headings, "- " bullets, "1. " numbered steps, "| a | b |" tables (first row is the header),
// and inline **bold** and [text](https://… or /path) links. Every other line is a paragraph.

const SAFE_URL = /^(https?:\/\/|\/)/;

function inline(s: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0, m: RegExpExecArray | null, n = 0;
  while ((m = re.exec(s))) {
    out.push(s.slice(last, m.index));
    if (m[1] !== undefined) out.push(<strong key={`${key}-${n++}`}>{inline(m[1], `${key}-${n}`)}</strong>);
    else if (SAFE_URL.test(m[3])) {
      const ext = m[3].startsWith("http");
      out.push(<a key={`${key}-${n++}`} href={m[3]} {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{m[2]}</a>);
    } else out.push(m[0]);
    last = re.lastIndex;
  }
  out.push(s.slice(last));
  return out;
}

const cells = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

export function BlogBody({ body }: { body: string }) {
  const lines = body.split(/\r?\n/), blocks: ReactNode[] = [];
  for (let i = 0; i < lines.length; ) {
    const line = lines[i];
    const run = (test: (l: string) => boolean) => { const r: string[] = []; while (i < lines.length && test(lines[i])) r.push(lines[i++]); return r; };
    if (/^\s*\|/.test(line)) {
      const rows = run((l) => /^\s*\|/.test(l)).filter((r) => !/^\s*\|[\s:|-]+\|?\s*$/.test(r)).map(cells);
      const [head, ...rest] = rows;
      blocks.push(
        <div key={i} className="blog-table"><table>
          <thead><tr>{head.map((c, j) => <th key={j} scope="col">{inline(c, `h${i}${j}`)}</th>)}</tr></thead>
          <tbody>{rest.map((r, k) => <tr key={k}>{r.map((c, j) => <td key={j}>{inline(c, `c${i}${k}${j}`)}</td>)}</tr>)}</tbody>
        </table></div>,
      );
    } else if (line.startsWith("- ")) {
      blocks.push(<ul key={i}>{run((l) => l.startsWith("- ")).map((l, j) => <li key={j}>{inline(l.slice(2), `u${i}${j}`)}</li>)}</ul>);
    } else if (/^\d+\. /.test(line)) {
      blocks.push(<ol key={i}>{run((l) => /^\d+\. /.test(l)).map((l, j) => <li key={j}>{inline(l.replace(/^\d+\. /, ""), `o${i}${j}`)}</li>)}</ol>);
    } else {
      i++;
      if (line.startsWith("### ")) blocks.push(<h3 key={i}>{inline(line.slice(4), `t${i}`)}</h3>);
      else if (line.startsWith("## ")) blocks.push(<h2 key={i}>{inline(line.slice(3), `t${i}`)}</h2>);
      else if (line.trim()) blocks.push(<p key={i}>{inline(line, `p${i}`)}</p>);
    }
  }
  return <article className="blog-body">{blocks}</article>;
}
