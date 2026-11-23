import { redirect } from "next/navigation";

// Sign-up (with Terms / consent capture) lives in the onboarding wizard.
export default function RegisterPage() {
  redirect("/onboarding");
}
