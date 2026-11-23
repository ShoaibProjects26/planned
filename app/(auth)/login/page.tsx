import { redirect } from "next/navigation";

// The old magic-link login form relied on an email provider that was never
// configured, so it silently failed. Sign-in lives at /auth/signin.
export default function LoginPage() {
  redirect("/auth/signin");
}
