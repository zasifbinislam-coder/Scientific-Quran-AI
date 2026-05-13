import { redirect } from "next/navigation";

// /signup is a friendly alias — the actual page is /login which has a toggle
// for "Sign in" / "Create account". We redirect with ?mode=signup so the
// page opens in signup state. (Currently the page doesn't read this param —
// it defaults to signin; left as a future polish in the roadmap.)
export default function SignupAliasPage() {
  redirect("/login?mode=signup");
}
