// Renders brochure.html to public/downloads/dpo-copilot-brochure.pdf with headless Chrome (or Edge). Run: node scripts/brochure/build.mjs
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const browsers = [process.env.CHROME, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "/usr/bin/google-chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"];
const bin = browsers.find((b) => b && existsSync(b));
if (!bin) throw new Error("No Chrome found; set CHROME to its path.");
const src = pathToFileURL(resolve("scripts/brochure/brochure.html")).href;
const out = resolve("public/downloads/dpo-copilot-brochure.pdf");
execFileSync(bin, ["--headless=new", "--disable-gpu", "--allow-file-access-from-files", "--no-pdf-header-footer", "--virtual-time-budget=5000", `--print-to-pdf=${out}`, src], { stdio: "inherit" });
console.log("wrote", out);
