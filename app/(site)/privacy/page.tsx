import { Banner } from "@/components/ui";

export const metadata = { title: "Privacy notice · DPO Copilot" };

// DRAFT for legal review. Bracketed items must be filled in before launch (PRD NFR7).
export default function Privacy() {
  return (
    <section className="site-inner" style={{ paddingTop: 48, maxWidth: 760 }}>
      <Banner kind="warn">Draft for legal review. Bracketed details are still to be confirmed.</Banner>
      <article className="sheet" style={{ border: 0, padding: 0, background: "none" }}>
        <h1>Privacy notice</h1>
        <p>This notice explains how [Company legal name] (&quot;DPO Copilot&quot;, &quot;we&quot;) handles personal data under the Nigeria Data Protection Act 2023 (NDPA).</p>

        <h2>Two roles</h2>
        <p><b>As a data controller</b>, we process data about people who visit our website, request pilot access, or hold an account with us.</p>
        <p><b>As a data processor</b>, we process the personal data that DPCO firms and their clients put into DPO Copilot, only on the firm&apos;s instructions and under a data processing agreement. For that data, the firm (or its client) is the controller. Please contact them first about it.</p>

        <h2>What we collect as a controller</h2>
        <ul>
          <li>Pilot requests: your name, work email, firm name, phone number and message.</li>
          <li>Accounts: name, email, password (stored only as a one-way hash), two-step sign-in settings, and sign-in records.</li>
          <li>Security logs: IP address, browser type and the actions taken in the app.</li>
        </ul>

        <h2>Why and on what basis</h2>
        <ul>
          <li>Responding to a pilot request: steps you asked us to take before a contract (NDPA s.25).</li>
          <li>Providing accounts and the service: performance of our contract with your firm.</li>
          <li>Security, fraud prevention and audit trails: our legitimate interests and legal obligations.</li>
        </ul>

        <h2>Where your data is kept</h2>
        <p>The application and its database run on servers in Nigeria with [hosting provider]. Uploaded documents such as PDFs and images are stored in CloudVantage object storage in Lagos, Nigeria, in a private bucket that is not publicly reachable. Client data is never used to train AI models.</p>

        <h2>Who we share it with</h2>
        <p>We share personal data only with the sub-processors below, under contract, and with authorities where the law requires it. We don&apos;t sell personal data.</p>
        <table className="register">
          <thead><tr><th>Sub-processor</th><th>Purpose</th><th>Location</th></tr></thead>
          <tbody>
            <tr><td>[Hosting provider]</td><td data-label="Purpose">Application servers, database and backups</td><td data-label="Location">Nigeria</td></tr>
            <tr><td>CloudVantage</td><td data-label="Purpose">Storage of uploaded documents (PDFs and images)</td><td data-label="Location">Lagos, Nigeria</td></tr>
            <tr><td>Resend, Inc.</td><td data-label="Purpose">Sending service emails (invitations, sign-in codes, notices and data request responses)</td><td data-label="Location">United States</td></tr>
          </tbody>
        </table>

        <h2>Transfers outside Nigeria</h2>
        <p>Most emails we send contain no compliance content, only a prompt to sign in. Some carry personal data: the email address of the recipient, and, when a firm&apos;s client completes a data subject request, the response letter and evidence sent to the person who made it. These emails pass through Resend in the United States. We rely on Resend&apos;s contractual safeguards for this transfer, as permitted by sections 41 to 43 of the NDPA. [Confirm the transfer basis with counsel.]</p>

        <h2>Cookies</h2>
        <p>We use only the cookies needed to keep you signed in and to protect sign-in. We don&apos;t use advertising or tracking cookies.</p>

        <h2>How long we keep it</h2>
        <ul>
          <li>Pilot requests: [12 months] after our last contact, unless you become a customer.</li>
          <li>Account data: for the life of your firm&apos;s subscription, then [period] under our data processing agreement.</li>
          <li>Audit logs: [6 years].</li>
        </ul>

        <h2>Your rights</h2>
        <p>You can ask for a copy of your personal data, ask us to correct or delete it, object to or restrict how we use it, ask for it in a portable format, and withdraw consent where we rely on it. You can also complain to the Nigeria Data Protection Commission.</p>

        <h2>Personal data breaches</h2>
        <p>If a breach affects data we process for a firm, we notify that firm without undue delay so it can meet its own obligations under NDPA s.40.</p>

        <h2>Contact</h2>
        <p>Data Protection Officer: [name], [email], [address].</p>
        <p className="meta">Last updated: 15 October 2026.</p>
      </article>
    </section>
  );
}
