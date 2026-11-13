// The DPO Copilot team, shown on /about and (photos, names and titles only) on the homepage.
// Photos go in public/images/team/; until a file exists the card shows the person's initials.
// linkedin: the full profile link (https://www.linkedin.com/in/...). Leave empty to hide the LinkedIn icon.

export type Member = { name: string; title: string; bio: string; linkedin: string; photo: string };

export const TEAM: Member[] = [
  {
    name: "Anya Victor",
    title: "Founder & CTO",
    bio: "Victor is a certified Data Protection Officer who founded DPO Copilot after seeing how much time compliance teams lose to spreadsheets and scattered records. He leads the product, engineering and AI, and brings years of experience in brand and digital design to make compliance software that is simple to use.",
    linkedin: "",
    photo: "/images/team/victor.jpg",
  },
  {
    name: "Gift Paul",
    title: "Operations, Customer Success & Content Lead",
    bio: "Gift is the main point of contact for DPO Copilot's partner firms. She leads onboarding, support and training, and runs DPO Copilot's content across LinkedIn, Instagram and the blog.",
    linkedin: "",
    photo: "/images/team/gift.jpg",
  },
];

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
