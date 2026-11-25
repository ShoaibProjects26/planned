import { googleAuthEnabled } from "@/lib/auth";
import { SignInForm } from "./signin-form";

// NextAuth sends failed sign-ins (e.g. from Google) back here with ?error=<code>.
const ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "This email already has a Planned account with a password. Sign in with your password below — once you've verified your email address, Sign in with Google will work too.",
  AccessDenied:
    "Google sign-in was refused. Please use a Google account with a verified email address.",
};

export default function SignInPage({
  searchParams,
}: {
  searchParams: { error?: string | string[] };
}) {
  const code = Array.isArray(searchParams.error) ? searchParams.error[0] : searchParams.error;
  const initialError = code
    ? ERROR_MESSAGES[code] ?? "We couldn't sign you in. Please try again."
    : "";

  return <SignInForm googleEnabled={googleAuthEnabled} initialError={initialError} />;
}
