// Native Word (.docx) from the app's own export HTML: the same content as the PDF, with the styling Word can show
// (headings, shaded table headers and labels, coloured risk badges and heat map, bars, page breaks, header and page numbers).
// ponytail: handles only the tags our exports emit (lib/car-report.ts, lib/dpia-report.ts, lib/remediation.ts, export route).
import {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, Packer, PageBreak, PageNumber, PageOrientation, TableLayoutType,
  ImageRun, type ParagraphChild, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType,
} from "docx";

type El = { tag: string; attrs: Record<string, string>; kids: Node[] };
type Node = El | string;
const VOID = new Set(["br", "meta", "img", "hr", "input", "link"]);
const decode = (s: string) => s.replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&");

function parse(html: string): El {
  const root: El = { tag: "root", attrs: {}, kids: [] };
  const stack: El[] = [root];
  for (const m of html.matchAll(/<!--[\s\S]*?-->|<(\/?)([a-zA-Z0-9]+)((?:[^>"']|"[^"]*"|'[^']*')*)>|([^<]+)/g)) {
    if (m[4] !== undefined) { stack.at(-1)!.kids.push(decode(m[4])); continue; }
    if (!m[2]) continue;
    const tag = m[2].toLowerCase();
    if (m[1]) { const i = stack.map((e) => e.tag).lastIndexOf(tag); if (i > 0) stack.length = i; continue; }
    const attrs: Record<string, string> = {};
    for (const a of (m[3] ?? "").matchAll(/([a-zA-Z-]+)(?:="([^"]*)")?/g)) attrs[a[1].toLowerCase()] = decode(a[2] ?? "");
    const el: El = { tag, attrs, kids: [] };
    stack.at(-1)!.kids.push(el);
    if (!VOID.has(tag) && !(m[3] ?? "").trim().endsWith("/")) stack.push(el);
  }
  return root;
}

const style = (e: El) => Object.fromEntries((e.attrs.style ?? "").split(";").map((d) => d.split(":").map((x) => x.trim())).filter((d) => d.length === 2 && d[0]));
const cls = (e: El, c: string) => (e.attrs.class ?? "").split(/\s+/).includes(c);
const hex = (c?: string) => {
  if (!c) return undefined;
  const m = c.match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/i);
  if (!m) return undefined;
  return (m[1].length === 3 ? m[1].split("").map((x) => x + x).join("") : m[1]).toUpperCase();
};
const NAVY = "1F3864", BLUE = "2A6AA8", MUTED = "6B7280";
const RISK_COLOR: Record<string, string> = { "r-high": "B42318", "r-medium": "B26A00", "r-low": "1E7A4C" };

type Fmt = { bold?: boolean; italics?: boolean; color?: string; shading?: string; size?: number; underline?: boolean };

/** Inline content → text runs. */
function runs(nodes: Node[], f: Fmt = {}): ParagraphChild[] {
  const out: ParagraphChild[] = [];
  for (const n of nodes) {
    if (typeof n === "string") {
      const t = n.replace(/\s+/g, " ");
      if (t) out.push(new TextRun({ text: t, bold: f.bold, italics: f.italics, color: f.color, size: f.size, underline: f.underline ? {} : undefined, shading: f.shading ? { type: ShadingType.CLEAR, fill: f.shading, color: "auto" } : undefined }));
      continue;
    }
    if (n.tag === "br") { out.push(new TextRun({ text: "", break: 1 })); continue; }
    if (n.tag === "img") { // data: URL images only (the firm logo)
      const m = /^data:image\/(png|jpeg);base64,(.+)$/.exec(n.attrs.src ?? "");
      if (m) out.push(new ImageRun({ type: m[1] === "png" ? "png" : "jpg", data: Buffer.from(m[2], "base64"), transformation: { width: Number(n.attrs.width) || 120, height: Number(n.attrs.height) || 60 } }));
      continue;
    }
    const s = style(n), g: Fmt = { ...f };
    if (n.tag === "b" || n.tag === "strong" || s["font-weight"] === "700") g.bold = true;
    if (n.tag === "i" || n.tag === "em" || s["font-style"] === "italic") g.italics = true;
    if (n.tag === "a") { g.color = BLUE; g.underline = true; }
    if (cls(n, "muted")) g.color = MUTED;
    if (cls(n, "todo")) g.shading = "FFF3D6";
    for (const c of Object.keys(RISK_COLOR)) if (cls(n, c)) { g.color = RISK_COLOR[c]; g.bold = true; }
    if (s.color) g.color = hex(s.color) ?? g.color;
    // A bar: an empty inline-block with a background and a % width → coloured block characters of that length.
    if (n.tag === "span" && s.width?.endsWith("%") && s.background && !n.kids.length) {
      out.push(new TextRun({ text: "█".repeat(Math.max(1, Math.round(parseFloat(s.width) / 100 * 40))), color: hex(s.background) }));
      continue;
    }
    if (s.background && n.tag === "span") g.shading = hex(s.background);
    out.push(...runs(n.kids, g));
  }
  return out;
}

type Ctx = { align?: (typeof AlignmentType)[keyof typeof AlignmentType]; first: { pending: boolean }; width: number };
const isBlock = (n: Node) => typeof n !== "string" && ["p", "h1", "h2", "h3", "h4", "ul", "ol", "table", "section", "div", "li"].includes(n.tag);
const hasText = (nodes: Node[]): boolean => nodes.some((n) => (typeof n === "string" ? n.trim() !== "" : n.tag === "br" || hasText(n.kids) || (n.tag === "span" && !!style(n).width)));

/** Block content → paragraphs and tables. */
function blocks(nodes: Node[], ctx: Ctx): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  let inline: Node[] = [];
  const flush = () => { if (hasText(inline)) out.push(new Paragraph({ children: runs(inline), alignment: ctx.align, spacing: { after: 120 } })); inline = []; };
  for (const n of nodes) {
    if (!isBlock(n)) { inline.push(n); continue; }
    flush();
    const e = n as El, s = style(e);
    const align = s["text-align"] === "center" ? AlignmentType.CENTER : ctx.align;
    switch (e.tag) {
      case "h1": out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: align, spacing: { before: 240, after: 120 }, children: runs(e.kids, { color: hex(style(e).color) ?? NAVY, bold: true, size: 30 }) })); break;
      case "h2": out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, alignment: align, spacing: { before: 200, after: 100 }, children: runs(e.kids, { color: hex(style(e).color) ?? NAVY, bold: true, size: 24 }) })); break;
      case "h3": case "h4": out.push(new Paragraph({ heading: HeadingLevel.HEADING_3, alignment: align, spacing: { before: 160, after: 80 }, children: runs(e.kids, { color: hex(style(e).color) ?? NAVY, bold: true, size: 21 }) })); break;
      case "p": {
        const note = cls(e, "note") || cls(e, "meta") || cls(e, "caption");
        const size = s["font-size"]?.endsWith("pt") ? Math.round(parseFloat(s["font-size"]) * 2) : note ? 17 : undefined;
        out.push(new Paragraph({ alignment: align, spacing: { after: 120 }, children: runs(e.kids, { italics: note || undefined, color: note ? MUTED : hex(s.color), size, bold: s["font-weight"] === "700" || undefined }) }));
        break;
      }
      case "ul": case "ol":
        e.kids.filter((k): k is El => typeof k !== "string" && k.tag === "li").forEach((li, i) => {
          const inner = li.kids.filter((k) => !isBlock(k));
          out.push(new Paragraph({ bullet: e.tag === "ul" ? { level: 0 } : undefined, spacing: { after: 60 }, children: [...(e.tag === "ol" ? [new TextRun(`${i + 1}. `)] : []), ...runs(inner)] }));
          out.push(...blocks(li.kids.filter(isBlock), ctx));
        });
        break;
      case "table": out.push(table(e, { ...ctx, align: undefined }), new Paragraph({ spacing: { after: 80 }, children: [] })); break;
      default: { // section / div
        if (cls(e, "break") && out.length + (ctx.first.pending ? 0 : 1) > 0) out.push(new Paragraph({ children: [new PageBreak()] }));
        if (cls(e, "seal")) { out.push(table({ tag: "table", attrs: {}, kids: [{ tag: "tr", attrs: {}, kids: [{ tag: "td", attrs: { style: "background:#EEF2FB" }, kids: e.kids }] }] }, ctx)); break; }
        out.push(...blocks(e.kids, { ...ctx, align }));
      }
    }
    ctx.first.pending = false;
  }
  flush();
  return out;
}

const border = { style: BorderStyle.SINGLE, size: 4, color: "C9CED6" };
function table(t: El, ctx: Ctx): Table {
  const rows = t.kids.flatMap((k) => (typeof k === "string" ? [] : k.tag === "tr" ? [k] : k.kids.filter((r): r is El => typeof r !== "string" && r.tag === "tr")));
  // Column widths from the first row's hints (style width % or px, label cells 30%), so Word doesn't size columns to content.
  const first = rows[0]?.kids.filter((c): c is El => typeof c !== "string" && (c.tag === "td" || c.tag === "th")) ?? [];
  const hint = first.map((c): { px?: number; pct?: number } | null => { const w = style(c).width; return w?.endsWith("px") ? { px: parseFloat(w) } : w?.endsWith("%") ? { pct: parseFloat(w) } : cls(c, "k") ? { pct: 30 } : null; });
  let cols: number[] | undefined, total = ctx.width;
  if (first.length && hint.every((h) => h?.px !== undefined)) { cols = hint.map((h) => Math.round((h?.px ?? 0) * 15)); total = cols.reduce((a, b) => a + b, 0); }
  else if (hint.some(Boolean)) {
    const fixed = hint.reduce((a, h) => a + (h ? (h.pct !== undefined ? (h.pct / 100) * ctx.width : (h.px ?? 0) * 15) : 0), 0), free = hint.filter((h) => !h).length;
    cols = hint.map((h) => Math.round(h ? (h.pct !== undefined ? (h.pct / 100) * ctx.width : (h.px ?? 0) * 15) : Math.max(600, (ctx.width - fixed) / Math.max(free, 1))));
  }
  return new Table({
    width: { size: total, type: WidthType.DXA },
    ...(cols ? { columnWidths: cols, layout: TableLayoutType.FIXED } : {}),
    borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
    rows: rows.map((tr) => new TableRow({
      cantSplit: true,
      children: tr.kids.filter((c): c is El => typeof c !== "string" && (c.tag === "td" || c.tag === "th")).map((c) => {
        const s = style(c), head = c.tag === "th", label = cls(c, "k"), sub = cls(tr, "sub");
        const fill = hex(s.background) ?? (head ? NAVY : label ? "F4F6FA" : sub ? "E8EEF7" : undefined);
        const fmt: Fmt = { bold: head || label || sub || undefined, color: hex(s.color) ?? (head && !hex(s.background) ? "FFFFFF" : undefined) };
        for (const r of Object.keys(RISK_COLOR)) if (cls(c, r)) { fmt.color = RISK_COLOR[r]; fmt.bold = true; }
        const inner = c.kids.some(isBlock) ? blocks(c.kids, { ...ctx, first: { pending: false } }).filter((b): b is Paragraph => b instanceof Paragraph)
          : [new Paragraph({ alignment: s["text-align"] === "center" ? AlignmentType.CENTER : undefined, children: runs(c.kids, fmt) })];
        return new TableCell({
          children: inner.length ? inner : [new Paragraph("")],
          columnSpan: c.attrs.colspan ? Number(c.attrs.colspan) : undefined,
          rowSpan: c.attrs.rowspan ? Number(c.attrs.rowspan) : undefined,
          shading: fill ? { type: ShadingType.CLEAR, fill, color: "auto" } : undefined,
          verticalAlign: VerticalAlign.TOP,
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
        });
      }),
    })),
  });
}

/** Word document from export HTML. `header` runs along the top of every page after the first; pages are numbered. */
export async function htmlToDocx(html: string, opts: { title: string; header?: string; landscape?: boolean }): Promise<Buffer> {
  const body = parse(html.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, ""));
  const children = blocks(body.kids, { first: { pending: true }, width: opts.landscape ? 14838 : 9906 }); // A4 text width in twips
  const small = { font: "Arial", size: 16, color: MUTED };
  const doc = new Document({
    title: opts.title,
    styles: { default: { document: { run: { font: "Arial", size: 20 }, paragraph: { spacing: { line: 276 } } } } },
    sections: [{
      properties: {
        titlePage: true,
        page: { size: opts.landscape ? { orientation: PageOrientation.LANDSCAPE } : undefined, margin: { top: 1100, bottom: 1000, left: 1000, right: 1000 } },
      },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: opts.header ?? opts.title, ...small })] })] }), first: new Header({ children: [] }) },
      footers: {
        default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "pg. ", ...small }), new TextRun({ children: [PageNumber.CURRENT], ...small })] })] }),
        first: new Footer({ children: [] }),
      },
      children,
    }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}
