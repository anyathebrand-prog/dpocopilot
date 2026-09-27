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
        <p>We host the service with [hosting provider] in Nigeria. Client data is never used to train AI models. Our sub-processors are listed at [link to sub-processor list].</p>

        <h2>Who we share it with</h2>
        <p>Only our sub-processors (such as hosting and email delivery providers), under contract, and authorities where the law requires it. We don&apos;t sell personal data.</p>

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
        <p className="meta">Last updated: [date].</p>
      </article>
    </section>
  );
}
