import { redirect } from "next/navigation";
import { getUser, home } from "@/lib/auth";

export default async function Root() {
  const u = await getUser();
  redirect(u ? home(u) : "/sign-in");
}
