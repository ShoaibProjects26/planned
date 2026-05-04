"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  Eye,
  EyeOff,
  Loader2,
  ChevronLeft,
  Check,
  GraduationCap,
  Heart,
  Compass,
  Wrench,
  Palette,
  Clock,
  MapPin,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface WizardData {
  // Step 1 — account
  name: string;
  email: string;
  password: string;
  // Step 2 — goals
  goals: string[];
  // Step 3 — curriculum
  curriculum: "BNC" | "MONTESSORI" | "UNSCHOOLING" | "";
  // Step 4 — faith
  faith: "ISLAM" | "CHRISTIANITY" | "JUDAISM" | "SECULAR" | "";
  faithIntegration: boolean;
  // Step 5 — location
  location: string;
}

const TOTAL_STEPS = 5;

const GOALS = [
  { id: "academics", label: "Strong academics", icon: <GraduationCap className="w-5 h-5" /> },
  { id: "faith", label: "Faith-centred learning", icon: <Heart className="w-5 h-5" /> },
  { id: "child-led", label: "Child-led discovery", icon: <Compass className="w-5 h-5" /> },
  { id: "life-skills", label: "Life skills", icon: <Wrench className="w-5 h-5" /> },
  { id: "creative", label: "Creative expression", icon: <Palette className="w-5 h-5" /> },
  { id: "routine", label: "Structured routine", icon: <Clock className="w-5 h-5" /> },
];

const CURRICULA = [
  {
    id: "BNC",
    label: "British National Curriculum",
    description:
      "Follow the KS1–KS4 framework used in state schools. Clear progression, familiar structure, great for exams later on.",
  },
  {
    id: "MONTESSORI",
    label: "Montessori",
    description:
      "Child-paced, hands-on learning through exploration. Focuses on independence, creativity, and intrinsic motivation.",
  },
  {
    id: "UNSCHOOLING",
    label: "Unschooling / Child-led",
    description:
      "Fully child-directed learning — following interests wherever they lead. Total freedom, maximum curiosity.",
  },
];

const FAITHS = [
  { id: "ISLAM", label: "Islam", emoji: "☪️" },
  { id: "CHRISTIANITY", label: "Christianity", emoji: "✝️" },
  { id: "JUDAISM", label: "Judaism", emoji: "✡️" },
  { id: "SECULAR", label: "Secular / No preference", emoji: "🌍" },
];

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`transition-all duration-300 rounded-full flex items-center justify-center
              ${i + 1 < step
                ? "w-7 h-7 bg-brand-green text-white"
                : i + 1 === step
                ? "w-7 h-7 bg-brand-green-deep text-white ring-4 ring-brand-green/20"
                : "w-2 h-2 bg-muted-foreground/30"
              }`}
          >
            {i + 1 < step ? (
              <Check className="w-3.5 h-3.5" />
            ) : i + 1 === step ? (
              <span className="text-xs font-bold">{step}</span>
            ) : null}
          </div>
          {i < TOTAL_STEPS - 1 && (
            <div
              className={`h-0.5 w-8 rounded-full transition-colors ${
                i + 1 < step ? "bg-brand-green" : "bg-muted-foreground/20"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Wizard ───────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [data, setData] = useState<WizardData>({
    name: "",
    email: "",
    password: "",
    goals: [],
    curriculum: "",
    faith: "",
    faithIntegration: false,
    location: "",
  });

  function update(patch: Partial<WizardData>) {
    setData((prev) => ({ ...prev, ...patch }));
    setError("");
  }

  function toggleGoal(id: string) {
    update({
      goals: data.goals.includes(id)
        ? data.goals.filter((g) => g !== id)
        : [...data.goals, id],
    });
  }

  // ── Step 1: Create account ──────────────────────────────────────────────────

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        password: data.password,
      }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Something went wrong");
      setLoading(false);
      return;
    }

    const signInResult = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    setLoading(false);

    if (signInResult?.error) {
      setError("Account created but sign-in failed — please try signing in manually.");
      return;
    }

    setStep(2);
  }

  // ── Steps 2–4: Navigation ───────────────────────────────────────────────────

  function handleNext() {
    if (step === 2 && data.goals.length === 0) {
      setError("Please choose at least one goal.");
      return;
    }
    if (step === 3 && !data.curriculum) {
      setError("Please choose a curriculum.");
      return;
    }
    if (step === 4 && !data.faith) {
      setError("Please choose an option.");
      return;
    }
    setError("");
    setStep((s) => s + 1);
  }

  // ── Step 5: Save and finish ─────────────────────────────────────────────────

  async function handleFinish(e: React.FormEvent) {
    e.preventDefault();

    if (!data.location.trim()) {
      setError("Please enter your town or city.");
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch("/api/onboarding/family", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goals: data.goals,
        curriculum: data.curriculum,
        faith: data.faith,
        faithIntegration: data.faithIntegration,
        location: data.location,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Something went wrong. Please try again.");
      return;
    }

    router.push("/onboarding/child");
  }

  // ─────────────────────────────────────────────────────────────────────────────

  const stepLabels = ["Account", "Goals", "Curriculum", "Faith & culture", "Location"];

  return (
    <div className="flex flex-col items-center px-4 py-10 min-h-screen">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="flex flex-col items-center mb-2">
          <div className="w-12 h-12 rounded-2xl planned-gradient flex items-center justify-center shadow-md mb-4">
            <CalendarCheck className="w-6 h-6 text-white" strokeWidth={1.75} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-green mb-1">
            {stepLabels[step - 1]}
          </p>
        </div>

        <ProgressBar step={step} />

        {/* Card */}
        <div className="bg-white rounded-3xl border border-border/50 shadow-sm overflow-hidden">

          {/* ── Step 1: Account ── */}
          {step === 1 && (
            <form onSubmit={handleCreateAccount} className="p-5 sm:p-8 space-y-5">
              <div>
                <h2 className="font-display text-2xl font-bold text-brand-green-deep">
                  Create your free account
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Takes 30 seconds. No credit card needed.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-brand-green-deep block mb-1.5">
                    Your name
                  </label>
                  <input
                    type="text"
                    value={data.name}
                    onChange={(e) => update({ name: e.target.value })}
                    placeholder="Sarah"
                    required
                    className="w-full h-11 px-4 rounded-xl border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green placeholder:text-muted-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-brand-green-deep block mb-1.5">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={data.email}
                    onChange={(e) => update({ email: e.target.value })}
                    placeholder="you@example.com"
                    required
                    className="w-full h-11 px-4 rounded-xl border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green placeholder:text-muted-foreground"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-brand-green-deep block mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={data.password}
                      onChange={(e) => update({ password: e.target.value })}
                      placeholder="At least 8 characters"
                      required
                      minLength={8}
                      className="w-full h-11 px-4 pr-11 rounded-xl border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green placeholder:text-muted-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-brand-green hover:bg-brand-green-deep disabled:opacity-60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Create my account
              </button>
            </form>
          )}

          {/* ── Step 2: Goals ── */}
          {step === 2 && (
            <div className="p-5 sm:p-8 space-y-5">
              <div>
                <h2 className="font-display text-2xl font-bold text-brand-green-deep">
                  What matters most to you?
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose everything that resonates — we&apos;ll weave it into your lessons.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {GOALS.map(({ id, label, icon }) => {
                  const selected = data.goals.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleGoal(id)}
                      className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all
                        ${selected
                          ? "border-brand-green bg-brand-mint text-brand-green-deep"
                          : "border-border/60 bg-white text-muted-foreground hover:border-brand-green/40 hover:bg-brand-mint/30"
                        }`}
                    >
                      <span className={selected ? "text-brand-green" : "text-muted-foreground"}>
                        {icon}
                      </span>
                      <span className="text-sm font-medium leading-tight">{label}</span>
                      {selected && (
                        <Check className="w-4 h-4 text-brand-green ml-auto shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 3: Curriculum ── */}
          {step === 3 && (
            <div className="p-5 sm:p-8 space-y-5">
              <div>
                <h2 className="font-display text-2xl font-bold text-brand-green-deep">
                  How do you like to teach?
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Your lessons will be generated to match this style.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                {CURRICULA.map(({ id, label, description }) => {
                  const selected = data.curriculum === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => update({ curriculum: id as WizardData["curriculum"] })}
                      className={`w-full text-left p-5 rounded-2xl border-2 transition-all
                        ${selected
                          ? "border-brand-green bg-brand-mint"
                          : "border-border/60 bg-white hover:border-brand-green/40 hover:bg-brand-mint/30"
                        }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={`font-semibold text-sm ${selected ? "text-brand-green-deep" : "text-foreground"}`}>
                            {label}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {description}
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center transition-colors
                          ${selected ? "border-brand-green bg-brand-green" : "border-muted-foreground/40"}`}>
                          {selected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 4: Faith ── */}
          {step === 4 && (
            <div className="p-5 sm:p-8 space-y-5">
              <div>
                <h2 className="font-display text-2xl font-bold text-brand-green-deep">
                  Faith and culture
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  When relevant, we can weave your faith values naturally into lessons — stories, references, and day-out suggestions.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {FAITHS.map(({ id, label, emoji }) => {
                  const selected = data.faith === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => update({ faith: id as WizardData["faith"] })}
                      className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all
                        ${selected
                          ? "border-brand-green bg-brand-mint"
                          : "border-border/60 bg-white hover:border-brand-green/40 hover:bg-brand-mint/30"
                        }`}
                    >
                      <span className="text-3xl">{emoji}</span>
                      <span className={`text-sm font-medium text-center leading-tight ${selected ? "text-brand-green-deep" : "text-foreground"}`}>
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {data.faith && data.faith !== "SECULAR" && (
                <button
                  type="button"
                  onClick={() => update({ faithIntegration: !data.faithIntegration })}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left
                    ${data.faithIntegration
                      ? "border-brand-green bg-brand-mint"
                      : "border-border/60 bg-white hover:border-brand-green/40"
                    }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                    ${data.faithIntegration ? "border-brand-green bg-brand-green" : "border-muted-foreground/40"}`}>
                    {data.faithIntegration && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-brand-green-deep">
                      Integrate faith values into lessons
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Stories, references, and activities aligned with your beliefs
                    </p>
                  </div>
                </button>
              )}
            </div>
          )}

          {/* ── Step 5: Location ── */}
          {step === 5 && (
            <form onSubmit={handleFinish} className="p-5 sm:p-8 space-y-5">
              <div>
                <h2 className="font-display text-2xl font-bold text-brand-green-deep">
                  Where are you based?
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  We use this to suggest local day out ideas — museums, parks, and places to explore near you.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-brand-green-deep block mb-1.5">
                  Your town or city
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={data.location}
                    onChange={(e) => update({ location: e.target.value })}
                    placeholder="e.g. Manchester, Leeds, Bristol"
                    required
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="bg-brand-mint/50 rounded-2xl p-4 space-y-2">
                <p className="text-xs font-semibold text-brand-green-deep uppercase tracking-wide">
                  Your setup
                </p>
                {[
                  { label: "Goals", value: data.goals.length > 0 ? data.goals.map(g => GOALS.find(x => x.id === g)?.label).join(", ") : "—" },
                  { label: "Curriculum", value: CURRICULA.find(c => c.id === data.curriculum)?.label ?? "—" },
                  { label: "Faith", value: FAITHS.find(f => f.id === data.faith)?.label ?? "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex gap-2 text-sm">
                    <span className="text-muted-foreground shrink-0 w-24">{label}</span>
                    <span className="text-brand-green-deep font-medium">{value}</span>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-brand-green hover:bg-brand-green-deep disabled:opacity-60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Continue — add your first child
              </button>
            </form>
          )}

          {/* ── Navigation footer (steps 2–4) ── */}
          {step >= 2 && step <= 4 && (
            <div className="px-5 pb-5 sm:px-8 sm:pb-8 flex gap-3">
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1.5 px-4 h-11 rounded-xl border border-input text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 h-11 bg-brand-green hover:bg-brand-green-deep text-white font-semibold rounded-xl transition-colors"
              >
                Continue
              </button>
            </div>
          )}
        </div>

        {/* Step hint */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          Step {step} of {TOTAL_STEPS}
        </p>
      </div>
    </div>
  );
}
