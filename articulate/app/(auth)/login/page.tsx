"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Check your email for a magic link to sign in.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🎙️</div>
          <h1 className="text-2xl font-bold text-white">Articulate</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Speech training for IT professionals
          </p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
          <h2 className="text-lg font-semibold text-white mb-4">Sign in</h2>

          {message ? (
            <div className="rounded-lg bg-indigo-950 border border-indigo-700 p-4 text-indigo-200 text-sm">
              {message}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-300 mb-1.5"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
              </div>

              {error && (
                <p className="text-red-400 text-xs">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-medium py-2.5 text-sm transition-colors"
              >
                {loading ? "Sending…" : "Send magic link"}
              </button>
            </form>
          )}

          <p className="mt-4 text-center text-xs text-slate-500">
            No account?{" "}
            <Link href="/signup" className="text-indigo-400 hover:underline">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
