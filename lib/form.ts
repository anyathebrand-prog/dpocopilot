// Small form helpers shared by server actions.

export const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
export const opt = (fd: FormData, k: string) => str(fd, k) || null;
export const all = (fd: FormData, k: string) => fd.getAll(k).map(String).filter(Boolean);

/** Only same-app paths are accepted as return targets. */
export function back(fd: FormData) {
  const b = str(fd, "back");
  if (!(b.startsWith("/app/") || b === "/app" || b.startsWith("/portal") || b.startsWith("/secretary")) || b.startsWith("//")) return "/";
  const [p, qs] = b.split("?");
  const keep = new URLSearchParams(qs);
  keep.delete("ok"); keep.delete("error");
  return keep.size ? `${p}?${keep}` : p;
}

/** Result messages travel in the URL so every form works without client JavaScript. */
export const flash = (path: string, msg: string, kind: "ok" | "error" = "ok") =>
  `${path}${path.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(msg)}`;
