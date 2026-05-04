import { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/layout/auth-form";
import { TreePine } from "lucide-react";

export const metadata: Metadata = {
  title: "Create your account",
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-brand-off-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl planned-gradient flex items-center justify-center mb-3 shadow-md">
            <TreePine className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-brand-green-deep">
            Start planning today
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            You teach. We plan. Free to get started.
          </p>
        </div>

        <AuthForm mode="register" />

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-brand-green hover:text-brand-green-deep font-medium underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>

        <p className="text-center text-xs text-muted-foreground mt-4">
          By signing up you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-4">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-4">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
