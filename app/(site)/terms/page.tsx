import { Banner } from "@/components/ui";

export const metadata = { title: "Terms · DPO Copilot" };

// DRAFT for legal review. Bracketed items must be filled in before launch.
export default function Terms() {
  return (
    <section className="site-inner" style={{ paddingTop: 48, maxWidth: 760 }}>
      <Banner kind="warn">Draft for legal review. Bracketed details are still to be confirmed.</Banner>
      <article className="sheet" style={{ border: 0, padding: 0, background: "none" }}>
        <h1>Terms of service</h1>
        <p>These terms are an agreement between [Company legal name] (&quot;DPO Copilot&quot;, &quot;we&quot;) and the firm that opens a DPO Copilot workspace (&quot;you&quot;).</p>

        <h2>The service</h2>
        <p>DPO Copilot is a workspace for managing data protection compliance under the Nigeria Data Protection Act 2023. It includes AI features that draft documents, flag possible gaps and answer regulatory questions from a curated source library.</p>

        <h2>Guidance, not legal advice</h2>
        <p>DPO Copilot supports, and does not replace, professional judgement. AI output is a draft until a qualified member of your team reviews and approves it. You remain responsible for the advice you give your clients and for anything you submit to the Nigeria Data Protection Commission. DPO Copilot does not file anything with the Commission on your behalf.</p>

        <h2>Your accounts</h2>
        <p>You control who in your firm has access and what role they hold. Keep sign-in details secure and tell us promptly if you suspect unauthorised access. Firm Admins must use two-step sign-in.</p>

        <h2>Your data</h2>
        <p>You and your clients own the data you put into DPO Copilot. We process it only to provide the service, under our data processing agreement, and we never use it to train AI models. When your subscription ends, you can export your records for [period] before we delete them.</p>

        <h2>Acceptable use</h2>
        <p>Don&apos;t upload unlawful content or malware, try to access another firm&apos;s data, or interfere with the service.</p>

        <h2>Fees</h2>
        <p>Fees are per seat, as agreed in your order or pilot agreement. [Payment terms.]</p>

        <h2>Availability and changes</h2>
        <p>We aim for [99.5%] availability during business hours (WAT). Regulatory content is updated as the law and NDPC guidance change. We&apos;ll give [30 days&apos;] notice of material changes to these terms.</p>

        <h2>Liability</h2>
        <p>[Limitation of liability wording to be agreed with counsel.]</p>

        <h2>Governing law</h2>
        <p>These terms are governed by the laws of the Federal Republic of Nigeria. [Dispute resolution forum.]</p>

        <p className="meta">Last updated: [date]. Contact: [email].</p>
      </article>
    </section>
  );
}
