"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Chrome, Mail, Loader2 } from "lucide-react";

interface AuthFormProps {
  mode: "login" | "register";
}

export function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState<"email" | "google" | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading("email");
    await signIn("email", { email, redirect: false });
    setEmailSent(true);
    setLoading(null);
  }

  async function handleGoogleSignIn() {
    setLoading("google");
    await signIn("google", { callbackUrl: "/dashboard" });
  }

  if (emailSent) {
    return (
      <div className="bg-white rounded-2xl border border-border/50 p-6 text-center shadow-sm">
        <div className="w-12 h-12 bg-brand-mint rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Mail className="w-6 h-6 text-brand-green" />
        </div>
        <h2 className="font-display font-semibold text-lg text-brand-green-deep mb-2">
          Check your email
        </h2>
        <p className="text-sm text-muted-foreground">
          We sent a sign-in link to <strong>{email}</strong>. Click it to
          continue.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-border/50 p-6 shadow-sm space-y-4">
      {/* Google */}
      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={handleGoogleSignIn}
        disabled={loading !== null}
      >
        {loading === "google" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Chrome className="w-4 h-4" />
        )}
        Continue with Google
      </Button>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>

      {/* Email */}
      <form onSubmit={handleEmailSignIn} className="space-y-3">
        <div>
          <Label htmlFor="email" className="text-sm">
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1.5"
          />
        </div>
        <Button
          type="submit"
          className="w-full bg-brand-green hover:bg-brand-green-deep"
          disabled={loading !== null}
        >
          {loading === "email" ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Mail className="w-4 h-4 mr-2" />
          )}
          {mode === "login" ? "Sign in with email" : "Sign up with email"}
        </Button>
      </form>
    </div>
  );
}
