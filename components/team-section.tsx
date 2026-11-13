import { existsSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { TEAM, initials, type Member } from "@/lib/team";
import { Reveal } from "./reveal";
import "./team.css";

/** True when the photo has been uploaded to public/; checked on the server each render, so adding the file is enough. */
const hasPhoto = (src: string) => existsSync(path.join(process.cwd(), "public", src.replace(/^\/+/, "")));

function Photo({ m, size }: { m: Member; size: number }) {
  return hasPhoto(m.photo)
    // eslint-disable-next-line @next/next/no-img-element -- static photo from public/, sized by CSS
    ? <img className="tm-photo" src={m.photo} alt={`Portrait of ${m.name}`} width={size} height={size} loading="lazy" />
    : <span className="tm-photo tm-initials" role="img" aria-label={`${m.name} (photo coming soon)`} style={{ width: size, height: size }}>{initials(m.name)}</span>;
}

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
    <path fill="currentColor" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
  </svg>
);

/** The full team section for /about: photo, name, title, bio and LinkedIn for each person. */
export function TeamSection() {
  return (
    <section className="tm" aria-labelledby="team-h">
      <div className="tm-head">
        <span className="tm-kicker">Our team</span>
        <h2 id="team-h">The people behind DPO Copilot</h2>
        <p>DPO Copilot is built by data protection practitioners for data protection practitioners. It is a product of Business Intelligence Technologies Limited, an IT governance and data protection compliance firm based in Lagos.</p>
      </div>
      <ul className="tm-cards">
        {TEAM.map((m, i) => (
          <li key={m.name} className="tm-card-wrap">
            <Reveal delay={i * 0.08} className="tm-card">
              <Photo m={m} size={112} />
              <h3>{m.name}</h3>
              <p className="tm-title">{m.title}</p>
              <p className="tm-bio">{m.bio}</p>
              {m.linkedin && <a className="tm-in" href={m.linkedin} target="_blank" rel="noopener noreferrer" aria-label={`${m.name} on LinkedIn (opens in a new tab)`}><LinkedInIcon /><span>LinkedIn</span></a>}
            </Reveal>
          </li>
        ))}
      </ul>
      <p className="tm-note">Supported by our engineering and infrastructure partners.</p>
    </section>
  );
}

/** Contact strip under the team section. */
export function TeamContact() {
  return (
    <div className="tm-strip">
      <p>Want to talk to the team?</p>
      <div className="tm-strip-btns">
        <Link href="/pilot" className="tm-btn tm-btn-solid">Book a demo</Link>
        <a href="mailto:info@dpocopilot.ng" className="tm-btn tm-btn-line">Email us</a>
      </div>
    </div>
  );
}

/** Homepage version: photos, names and titles only, linking to the full section on /about. */
export function TeamPreview() {
  return (
    <section className="tm tm-mini" aria-labelledby="team-mini-h">
      <div className="tm-head">
        <span className="tm-kicker">Our team</span>
        <h2 id="team-mini-h">The people behind DPO Copilot</h2>
      </div>
      <ul className="tm-mini-list">
        {TEAM.map((m) => (
          <li key={m.name}><Photo m={m} size={88} /><b>{m.name}</b><span>{m.title}</span></li>
        ))}
      </ul>
      <Link href="/about#team" className="tm-more">Meet the team <ArrowRight aria-hidden /></Link>
    </section>
  );
}
