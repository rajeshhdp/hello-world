"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

const IT_ROLES = [
  { value: "engineer", label: "Software Engineer" },
  { value: "manager", label: "Engineering Manager" },
  { value: "architect", label: "Solutions Architect" },
  { value: "devops", label: "DevOps / SRE" },
  { value: "qa", label: "QA / Test Engineer" },
  { value: "designer", label: "UX / Product Designer" },
  { value: "other", label: "Other IT Role" },
];

const LANGUAGES = [
  { value: "hindi", label: "Hindi" },
  { value: "mandarin", label: "Mandarin" },
  { value: "spanish", label: "Spanish" },
  { value: "french", label: "French" },
  { value: "portuguese", label: "Portuguese" },
  { value: "arabic", label: "Arabic" },
  { value: "japanese", label: "Japanese" },
  { value: "korean", label: "Korean" },
  { value: "german", label: "German" },
  { value: "other", label: "Other" },
];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"account" | "profile">("account");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [nativeLanguage, setNativeLanguage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStep("profile");
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    // Sign up via magic link
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { it_role: role, native_language: nativeLanguage },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setMessage("Check your email for a confirmation link to get started!");
    setLoading(false);
  }

  if (message) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">📬</div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Check your email
          </h2>
          <p className="text-slate-400 text-sm">{message}</p>
          <Link
            href="/login"
            className="mt-6 block text-indigo-400 hover:underline text-sm"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🎙️</div>
          <h1 className="text-2xl font-bold text-white">Get started</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Improve your spoken English for IT work
          </p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
          {/* Step indicators */}
          <div className="flex gap-2 mb-6">
            {["account", "profile"].map((s, i) => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  step === s || (i === 0 && step === "profile")
                    ? "bg-indigo-500"
                    : "bg-slate-700"
                }`}
              />
            ))}
          </div>

          {step === "account" ? (
            <form onSubmit={handleAccountSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={!email}
                className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-medium py-2.5 text-sm transition-colors"
              >
                Continue
              </button>
            </form>
          ) : (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Your IT role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="">Select your role…</option>
                  {IT_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Native language
                </label>
                <select
                  value={nativeLanguage}
                  onChange={(e) => setNativeLanguage(e.target.value)}
                  required
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="">Select language…</option>
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("account")}
                  className="flex-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2.5 text-sm transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !role || !nativeLanguage}
                  className="flex-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-medium py-2.5 text-sm transition-colors"
                >
                  {loading ? "Creating…" : "Create account"}
                </button>
              </div>
            </form>
          )}

          <p className="mt-4 text-center text-xs text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-400 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
