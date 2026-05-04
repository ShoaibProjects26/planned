import { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/layout/auth-form";
import { TreePine } from "lucide-react";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-brand-off-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl planned-gradient flex items-center justify-center mb-3 shadow-md">
            <TreePine className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-brand-green-deep">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in to your Planned account
          </p>
        </div>

        <AuthForm mode="login" />

        <p className="text-center text-sm text-muted-foreground mt-6">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-brand-green hover:text-brand-green-deep font-medium underline-offset-4 hover:underline"
          >
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}
