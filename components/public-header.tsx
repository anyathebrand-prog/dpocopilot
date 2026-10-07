"use client";
import { usePathname } from "next/navigation";
import { DarkHeader } from "./dark-header";

// Pages that draw the dark header inside their own black layout.
const OWN_HEADER = ["/", "/pricing", "/pilot", "/blog", "/sign-in", "/sign-up"];
// Signed-in areas keep their own sidebar navigation.
const APP_AREAS = ["/app", "/portal", "/secretary", "/account"];

/** The homepage header on every other public page (legal, sign-up, two-step sign-in, invitations, errors), in a black band. */
export function PublicHeader({ brand }: { brand?: { name: string; logo: string } }) {
  const path = usePathname();
  if (OWN_HEADER.includes(path) || path.startsWith("/blog/") || APP_AREAS.some((a) => path === a || path.startsWith(a + "/"))) return null;
  return <div className="dh-bar"><DarkHeader brand={brand} /></div>;
}
