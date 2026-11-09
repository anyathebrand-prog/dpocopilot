import { tx, one } from "./db";
import { insertClient } from "./clients";
import { sizeFor } from "./client-size";

// Sample content for a sales demo: three made-up clients with a data map, RoPA, a DPIA, an open breach, DSARs and tasks.
// Every name is fictional. Clients already in the firm (same name) are skipped, so running it twice adds nothing.

type Ropa = [purpose: string, basis: string, subjects: string, categories: string, sensitive: boolean, recipients: string, retention: string, dept: string, highRisk: boolean];
type DemoClient = { name: string; sector: string; subjects: number; departments: number; inventory: [string, string, boolean?][]; ropa: Ropa[] };

const CLIENTS: DemoClient[] = [
  {
    name: "Lekki Family Clinic (demo)", sector: "Health", subjects: 2400, departments: 8,
    inventory: [["data_subject", "Patients"], ["data_subject", "Staff"], ["data_category", "Health records", true], ["data_category", "Contact details"], ["data_category", "Payment details"], ["system", "Electronic medical records"], ["system", "Billing software"], ["recipient", "HMOs"], ["recipient", "Diagnostic labs"]],
    ropa: [
      ["Patient care and treatment", "vital_interest", "Patients", "Health records, contact details", true, "Doctors, diagnostic labs", "10 years after last visit", "Clinical", true],
      ["Billing and HMO claims", "contract", "Patients", "Contact details, payment details, HMO number", false, "HMOs", "6 years", "Finance", false],
      ["Staff payroll", "legal_obligation", "Staff", "Bank details, tax ID, salary", false, "FIRS, PFA", "6 years after exit", "HR", false],
    ],
  },
  {
    name: "Ikeja Microfinance Bank (demo)", sector: "Financial services", subjects: 15000, departments: 14,
    inventory: [["data_subject", "Customers"], ["data_subject", "Loan guarantors"], ["data_category", "BVN and NIN"], ["data_category", "Account and transaction data"], ["data_category", "Biometrics", true], ["system", "Core banking"], ["system", "Mobile app"], ["recipient", "Credit bureaus"], ["transfer", "Cloud backup (EU)"]],
    ropa: [
      ["Account opening and KYC", "legal_obligation", "Customers", "BVN, NIN, ID documents, photo, biometrics", true, "NIBSS, CBN", "5 years after account closes", "Operations", true],
      ["Loan assessment", "contract", "Customers, guarantors", "Income, credit history, BVN", false, "Credit bureaus", "5 years after repayment", "Credit", true],
      ["Marketing messages", "consent", "Customers", "Name, phone, email", false, "SMS provider", "Until consent is withdrawn", "Marketing", false],
    ],
  },
  {
    name: "Abuja Online Store (demo)", sector: "Retail and e-commerce", subjects: 450, departments: 5,
    inventory: [["data_subject", "Customers"], ["data_category", "Delivery addresses"], ["data_category", "Order history"], ["system", "Online shop"], ["recipient", "Courier companies"], ["recipient", "Payment gateway"]],
    ropa: [
      ["Order fulfilment and delivery", "contract", "Customers", "Name, phone, address, order history", false, "Couriers, payment gateway", "2 years", "Operations", false],
      ["Customer support", "legitimate_interest", "Customers", "Name, contact details, messages", false, "Helpdesk tool", "2 years", "Support", false],
    ],
  },
];

const day = (n: number) => { const d = new Date(Date.now() + 3600e3); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

/** Fill a DPCO firm with demo clients and records. Returns how many clients were added. */
export async function fillDemo(firmId: string) {
  const admin = await one<{ user_id: string; id: string }>("select user_id, id from memberships where firm_id = $1 and status = 'active' order by (role = 'firm_admin') desc, created_at limit 1", [firmId]);
  if (!admin) throw new Error("The firm has no active member.");
  const by = admin.user_id;
  let added = 0;
  for (const c of CLIENTS) {
    if (await one("select 1 from clients where firm_id = $1 and name = $2", [firmId, c.name])) continue;
    await tx(async (t) => {
      const id = await insertClient(t, firmId, by, { name: c.name, sector: c.sector, size: sizeFor(c.subjects, c.departments), car_filing_due_on: `${new Date().getFullYear() + 1}-03-31` });
      await t.query("update clients set data_subjects_count = $2, departments_count = $3, status = 'active', subscription_ends = $4::date where id = $1", [id, c.subjects, c.departments, day(365)]);
      for (const [type, name, sensitive] of c.inventory)
        await t.query("insert into inventory_items (firm_id, client_id, item_type, name, is_sensitive, source) values ($1,$2,$3,$4,$5,'manual')", [firmId, id, type, name, !!sensitive]);
      const ropaIds: string[] = [];
      for (const [purpose, basis, subjects, cats, sensitive, recipients, retention, dept, high] of c.ropa) {
        const r = await t.query<{ id: string }>(`insert into ropa_entries (firm_id, client_id, state, purpose, lawful_basis, data_subjects, data_categories, involves_sensitive, recipients, retention_period, security_measures, department, is_high_risk, source)
          values ($1,$2,'active',$3,$4,$5,$6,$7,$8,$9,'Role-based access, encryption at rest, staff training',$10,$11,'manual') returning id`, [firmId, id, purpose, basis, subjects, cats, sensitive, recipients, retention, dept, high]);
        ropaIds.push(r.rows[0].id);
      }
      const highRisk = c.ropa.findIndex((r) => r[8]);
      if (highRisk >= 0) {
        const d = await t.query<{ id: string }>("insert into dpias (firm_id, client_id, title, review_date, assessment_year, created_by) values ($1,$2,$3,$4,$5,$6) returning id",
          [firmId, id, `DPIA: ${c.ropa[highRisk][0]}`, day(330), new Date().getFullYear(), by]);
        await t.query("insert into dpia_ropa (dpia_id, ropa_entry_id) values ($1,$2)", [d.rows[0].id, ropaIds[highRisk]]);
      }
      if (added === 0) // the first client gets a live breach, so the 72-hour countdown shows
        await t.query(`insert into breaches (firm_id, client_id, reported_via, reported_by, aware_at, deadline_at, description, data_affected, subjects_affected, est_count, containment, severity)
          values ($1,$2,'firm',$3, now() - interval '20 hours', now() + interval '52 hours', 'A staff laptop holding a patient appointment spreadsheet was stolen from a car.', 'Names, phone numbers, appointment dates', 'Patients', 320, 'Laptop account disabled; remote wipe requested.', 'medium')`, [firmId, id, by]);
      await t.query(`insert into dsars (firm_id, client_id, source, logged_by, request_type, received_on, period_days, deadline_on, requester_name, requester_contact, details)
        values ($1,$2,'firm',$3,'access',$4,30,$5,'Chioma Okafor (demo)','chioma@example.com','Asks for a copy of all personal data held about her.')`, [firmId, id, by, day(-6), day(24)]);
      for (const [title, sub, due] of [["Collect signed privacy notice", "Policies", 7], ["Upload staff training records", "Evidence", 14], ["Review DPIA risk scores", "DPIA", 21]] as const)
        await t.query("insert into tasks (firm_id, client_id, title, project_name, sub_activity, assignee_membership_id, due_on, created_by) values ($1,$2,$3,'NDPA compliance',$4,$5,$6,$7)", [firmId, id, title, sub, admin.id, day(due), by]);
    });
    added++;
  }
  return added;
}
