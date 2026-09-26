import type { PGlite } from "@electric-sql/pglite";
import { hashPassword } from "./crypto";

// Platform content seed (schema §10.1). Runs once, on an empty database.
// The regulatory library below is a PARAPHRASED SEED for testing, clearly versioned "v0-seed".
// The Secretary must replace it with the official gazetted text before firms rely on it.

const CAR: [string, string, string | null][] = [
  ["governance", "Data Protection Officer designated and documented", null],
  ["governance", "Data protection policies and procedures approved and current", "approved_policies"],
  ["governance", "Privacy notice published", "approved_policies"],
  ["governance", "Staff data protection training records", null],
  ["governance", "Data subject request procedure in place", null],
  ["governance", "Breach response procedure in place", null],
  ["governance", "RoPA current and maintained", "ropa_current"],
  ["technology", "Encryption of personal data at rest and in transit", null],
  ["technology", "Access controls and periodic user access reviews", null],
  ["technology", "Backup and recovery arrangements", null],
  ["technology", "Retention and deletion schedule applied", null],
  ["technology", "Security incident logging and monitoring", null],
  ["accountability_risk", "Lawful basis documented for each processing activity", "ropa_lawful_basis"],
  ["accountability_risk", "DPIAs completed for high-risk processing", "dpias"],
  ["accountability_risk", "Risk register with mitigation plans", "dpias"],
  ["accountability_risk", "Evidence of periodic compliance reviews", null],
  ["accountability_risk", "Prior audit findings closed out", null],
  ["accountability_risk", "Major-importance status assessed and NDPC registration completed where applicable", null],
  ["cross_border_transfer", "Inventory of personal data transferred outside Nigeria", "ropa_transfers"],
  ["cross_border_transfer", "Legal basis or safeguard documented for each transfer", "ropa_transfers"],
  ["cross_border_transfer", "Records of transfers maintained", null],
  ["data_processors", "List of data processors and what they process", "ropa_recipients"],
  ["data_processors", "Contracts with processors include data protection clauses", null],
  ["data_processors", "Due diligence or risk assessment records for key processors", null],
];

const NDPA: [string, string, string][] = [
  ["Section 24", "Principles of processing", "Personal data must be processed fairly, lawfully and transparently; collected for specified, explicit and legitimate purposes; adequate, relevant and limited to what is necessary; kept accurate; retained no longer than necessary; and secured with appropriate technical and organisational measures. Controllers and processors owe a duty of care and must be able to demonstrate accountability."],
  ["Section 25", "Lawful basis of processing", "Processing is lawful only where at least one basis applies: consent of the data subject; performance of a contract with the data subject; compliance with a legal obligation; protection of vital interests; performance of a task in the public interest or exercise of official authority; or legitimate interests not overridden by the rights and freedoms of the data subject."],
  ["Section 26", "Consent", "Where processing relies on consent, the controller must be able to demonstrate it. Consent must be freely given, specific, informed and unambiguous. Silence or inactivity is not consent. The data subject may withdraw consent at any time, and withdrawal must be as easy as giving it."],
  ["Section 27", "Information to be provided to the data subject", "Before or at collection, the controller must tell the data subject its identity and contact details, the purposes and lawful basis of processing, recipients, the retention period, the data subject's rights including the right to complain to the Commission, and whether data will be transferred outside Nigeria."],
  ["Section 28", "Data privacy impact assessment", "Where processing is likely to result in a high risk to the rights and freedoms of data subjects, the controller must carry out a data privacy impact assessment before processing. It should describe the processing and its purposes, assess necessity and proportionality, identify risks, and set out measures to address them."],
  ["Section 30", "Sensitive personal data", "Processing of sensitive personal data (including genetic and biometric data, health, racial or ethnic origin, religious or similar beliefs, political opinions or affiliations, sex life or sexual orientation, and trade union membership) is prohibited unless a specific condition applies, such as explicit consent or obligations in employment and social security law."],
  ["Section 32", "Data protection officer", "A data controller of major importance must designate a data protection officer with expert knowledge of data protection law and practice, who advises the controller, monitors compliance and acts as the contact point with the Commission."],
  ["Section 34", "Rights of the data subject", "A data subject may obtain confirmation of processing and a copy of their personal data, and may request rectification, erasure or restriction of processing. Requests must be handled without undue delay. Related rights include withdrawal of consent (s.35), objection (s.36), rights on automated decision-making (s.37) and data portability (s.38)."],
  ["Section 39", "Security of personal data", "Controllers and processors must implement appropriate technical and organisational measures to secure personal data, which may include pseudonymisation, encryption, ensuring ongoing confidentiality, integrity and availability, the ability to restore access after an incident, and regular testing of measures."],
  ["Section 40", "Personal data breaches", "A processor must notify the controller of a breach without undue delay. Where a breach is likely to result in a risk to the rights and freedoms of individuals, the controller must notify the Commission within 72 hours of becoming aware of it. Where the risk is high, the controller must also inform affected data subjects immediately in plain language. Notifications should describe the nature of the breach, the categories and approximate number of people and records affected, likely consequences, measures taken, and a contact point."],
  ["Section 41", "Cross-border transfer", "Personal data may be transferred outside Nigeria only where the recipient is subject to a law, binding corporate rules, contractual clauses, code of conduct or certification that affords an adequate level of protection, or where another basis in section 43 applies. The controller must record the basis for each transfer and the adequacy of protection."],
  ["Section 43", "Other bases for cross-border transfer", "Without adequate protection, a transfer may still take place where, for example, the data subject has consented after being informed of the risks, the transfer is necessary for a contract with the data subject, or it is necessary for important reasons of public interest or legal claims."],
  ["Section 44", "Registration of controllers and processors of major importance", "Data controllers and data processors of major importance must register with the Commission within the period prescribed, and notify the Commission of significant changes to the information registered."],
  ["Section 65", "Data controller or processor of major importance", "Means a controller or processor domiciled, resident or operating in Nigeria that processes, or intends to process, personal data of more than such number of data subjects within Nigeria as the Commission may prescribe, or any other class the Commission designates as processing personal data of particular value or significance to the economy, society or security of Nigeria."],
];

export async function seed(db: PGlite) {
  const { rows } = await db.query<{ n: number }>("select count(*)::int as n from car_template_items");
  if (rows[0].n > 0) return;

  await db.transaction(async (t) => {
    for (const [i, [cat, text, rule]] of CAR.entries())
      await t.query("insert into car_template_items (category_key, text, position, auto_link_rule, status) values ($1,$2,$3,$4,'published')", [cat, text, i, rule]);

    await t.query("insert into platform_settings (key, published_value) values ('dsar_response_days','30') on conflict do nothing");

    const doc = await t.query<{ id: string }>("insert into reg_documents (title, doc_type, version_label, status) values ('Nigeria Data Protection Act 2023 (seed summary, verify)','act','v0-seed','published') returning id");
    for (const [i, [ref, heading, body]] of NDPA.entries())
      await t.query("insert into reg_sections (document_id, section_ref, heading, body, position) values ($1,$2,$3,$4,$5)", [doc.rows[0].id, ref, heading, body, i]);

    await t.query(`insert into mi_criteria (description, question_key, op, value, source_ref, position, status) values
      ('Processes personal data of more than 200 data subjects in six months (seed threshold: confirm against current NDPC guidance)', 'subjects_6mo', 'gte', '200', 'NDPA 2023 s.65 (v0-seed)', 0, 'published'),
      ('Processes personal data of particular value or significance to the economy, society or security of Nigeria', 'mi_significance', 'yes', null, 'NDPA 2023 s.65 (v0-seed)', 1, 'published')`);

    // FLAG-15: no Secretary sign-up path. Dev gets a default account; production creates one by hand.
    if (process.env.NODE_ENV !== "production")
      await t.query("insert into users (name, email, password_hash, platform_role) values ('Content Secretary','secretary@dpocopilot.local',$1,'secretary') on conflict do nothing", [hashPassword("secretary-dev-only")]);
  });
}
