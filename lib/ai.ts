import { q } from "./db";
import type { User } from "./auth";

// AI gateway (TRD §7): the only module that talks to a model.
// Points at any OpenAI-compatible endpoint (vLLM in Nigeria per NFR5) via AI_BASE_URL / AI_MODEL.
// Without AI_BASE_URL it runs as the TRD's local "stub" — it returns the deterministic template draft unchanged.
// No prompt or output text is logged or stored in ai_generations (TRD §7.3).

const BASE = process.env.AI_BASE_URL;
const MODEL = process.env.AI_MODEL ?? "stub-template-v1";
export const aiLive = Boolean(BASE);

async function chat(system: string, user: string): Promise<string> {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(process.env.AI_API_KEY ? { authorization: `Bearer ${process.env.AI_API_KEY}` } : {}) },
    body: JSON.stringify({ model: MODEL, temperature: 0.2, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`AI service returned ${res.status}`);
  return (await res.json()).choices[0].message.content as string;
}

async function log(u: User, clientId: string | null, kind: "draft" | "qa_answer", status: "done" | "failed" | "not_covered") {
  await q("insert into ai_generations (firm_id, client_id, requested_by, kind, model, status) values ($1,$2,$3,$4,$5,$6)", [u.firm_id, clientId, u.id, kind, MODEL, status]);
  await q("insert into audit_events (firm_id, client_id, actor_user_id, actor_role, action, entity_type, details) values ($1,$2,$3,$4,'ai_generate','ai_generation',$5)", [u.firm_id, clientId, u.id, u.role, JSON.stringify({ kind, model: MODEL, status })]);
}

/** FR11: improve a template draft using the client's structured data. Output is always stored as an unapproved "AI draft". */
export async function draft(u: User, clientId: string, what: string, templateDraft: string, facts: object): Promise<string> {
  if (!BASE) { await log(u, clientId, "draft", "done"); return templateDraft; }
  try {
    const text = await chat(
      "You draft Nigerian data protection compliance documents under the NDPA 2023 for review by a qualified DPO. Use only the facts given. Keep the heading structure. Leave [To be completed] where facts are missing. Never invent names, numbers or legal citations. Output the document only.",
      `Draft: ${what}\n\nClient facts (JSON):\n${JSON.stringify(facts)}\n\nStarting draft:\n${templateDraft}`,
    );
    await log(u, clientId, "draft", "done");
    return text;
  } catch (e) {
    await log(u, clientId, "draft", "failed");
    throw new Error("AI drafting failed. Try again, or edit the draft by hand.");
  }
}

export type Passage = { id: string; section_ref: string; heading: string | null; body: string; title: string; version_label: string; rank: number };

// Below these a passage is "not covered" (FR13.3): one stray keyword is not an answer.
// Tune both against the Secretary's golden question set (TRD §12.4).
const MIN_RANK = 0.01;
const MIN_TERMS = 2;

/** FR13: answer only from retrieved library passages, or say the library doesn't cover it. */
export async function ask(u: User, question: string): Promise<{ text: string | null; passages: Passage[] }> {
  // ponytail: Postgres full-text retrieval only; add pgvector embeddings (TRD §7.1) when keyword recall falls short.
  const words = terms(question);
  if (!words.length) { await log(u, null, "qa_answer", "not_covered"); return { text: null, passages: [] }; }
  const passages = await q<Passage & { hits: number }>(`select s.id, s.section_ref, s.heading, s.body, d.title, d.version_label, ts_rank(s.tsv, websearch_to_tsquery('english', $1)) as rank,
      (select count(*)::int from unnest($2::text[]) w where s.tsv @@ plainto_tsquery('english', w)) as hits
    from reg_sections s join reg_documents d on d.id = s.document_id
    where d.status = 'published' and s.tsv @@ websearch_to_tsquery('english', $1)
    order by hits desc, rank desc limit 4`, [words.join(" or "), words]);
  const hits = passages.filter((p) => p.rank >= MIN_RANK && p.hits >= Math.min(MIN_TERMS, words.length));
  if (!hits.length) { await log(u, null, "qa_answer", "not_covered"); return { text: null, passages: [] }; }
  if (!BASE) { await log(u, null, "qa_answer", "done"); return { text: null, passages: hits }; }
  try {
    const text = await chat(
      "Answer questions about Nigerian data protection law using ONLY the numbered passages. Cite passages inline as [1], [2]. If the passages do not answer the question, reply exactly: NOT COVERED. Be brief and practical.",
      `${hits.map((p, i) => `[${i + 1}] ${p.title}, ${p.section_ref}: ${p.body}`).join("\n\n")}\n\nQuestion: ${question}`,
    );
    const covered = !/^NOT COVERED/i.test(text.trim());
    await log(u, null, "qa_answer", covered ? "done" : "not_covered");
    return covered ? { text, passages: hits } : { text: null, passages: [] };
  } catch {
    await log(u, null, "qa_answer", "failed");
    throw new Error("The AI service is unavailable. Matching passages are shown below.");
  }
}

// Natural-language questions rarely match every word; retrieve on any significant term, then require MIN_TERMS of them.
const STOP = new Set(["what", "when", "which", "does", "the", "are", "for", "how", "must", "should", "can", "our", "and", "with", "under", "about", "have", "has", "who", "why", "need", "long", "there", "this", "that", "from", "into", "they", "their", "you", "your"]);
const terms = (s: string) => [...new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)))];
