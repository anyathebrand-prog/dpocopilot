import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { INSTALL } from "@/lib/install";

// Social preview (Open Graph / Twitter / WhatsApp / LinkedIn): 1200×630, in the homepage's colours and display font.
export const alt = `${INSTALL.name}: NDPA compliance workspace for DPCOs`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const pub = join(process.cwd(), "public");
  const body = join(process.cwd(), "node_modules", "@fontsource", "atkinson-hyperlegible-next", "files");
  const [rocpar, regular, medium, logo] = await Promise.all([
    readFile(join(pub, "fonts", "Rocpar.otf")),
    readFile(join(body, "atkinson-hyperlegible-next-latin-400-normal.woff")),
    readFile(join(body, "atkinson-hyperlegible-next-latin-600-normal.woff")),
    readFile(join(pub, INSTALL.logo.replace(/^\//, ""))).catch(() => null),
  ]);
  const grid = "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "60px 72px", background: "#0b1220", backgroundImage: `radial-gradient(circle at 85% 15%, rgba(42,106,168,0.55), transparent 55%), ${grid}`, backgroundSize: "100% 100%, 48px 48px, 48px 48px", color: "#ffffff", fontFamily: "Atkinson" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- rendered to PNG by satori */}
          {logo ? <img src={`data:image/png;base64,${logo.toString("base64")}`} height={56} style={{ height: 56 }} /> : <div style={{ fontSize: 40, fontFamily: "Rocpar" }}>{INSTALL.name}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignSelf: "flex-start", fontSize: 22, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#9ccbee", border: "1px solid rgba(156,203,238,0.35)", borderRadius: 999, padding: "8px 20px", marginBottom: 30 }}>NDPA 2023 · GAID 2025</div>
          <div style={{ fontFamily: "Rocpar", fontSize: 64, lineHeight: 1.15, letterSpacing: 1 }}>Compliance for DPCOs,</div>
          <div style={{ fontFamily: "Rocpar", fontSize: 64, lineHeight: 1.15, letterSpacing: 1, backgroundImage: "linear-gradient(to right, #ffffff, #9ccbee)", backgroundClip: "text", color: "transparent" }}>in one workspace</div>
          <div style={{ fontSize: 30, color: "#b8c4d6", marginTop: 26, maxWidth: 960, lineHeight: 1.4 }}>RoPA, DPIA, breach, DSAR and CAR readiness for every client.</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 26, color: "#8a97ab" }}>
          <span>dpocopilot.ng</span>
          <span style={{ color: "#cfe6f8" }}>Built in Nigeria, hosted in Lagos</span>
        </div>
      </div>
    ),
    { ...size, fonts: [
      { name: "Rocpar", data: rocpar, style: "normal", weight: 400 },
      { name: "Atkinson", data: regular, style: "normal", weight: 400 },
      { name: "Atkinson", data: medium, style: "normal", weight: 600 },
    ] },
  );
}
