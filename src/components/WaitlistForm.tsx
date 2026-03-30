"use client";

import { useState } from "react";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState("");

  if (state === "success") {
    return (
      <p className="text-sm text-muted-foreground">
        You&apos;re on the list. We&apos;ll be in touch.
      </p>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setState("submitting");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
        setState("idle");
        return;
      }

      setState("success");
    } catch {
      setError("Something went wrong");
      setState("idle");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-md mx-auto">
      <input
        type="email"
        required
        placeholder="you@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-[box-shadow,border-color] duration-150"
      />
      <button
        type="submit"
        disabled={state === "submitting"}
        className="rounded-lg bg-primary text-primary-foreground font-medium px-5 py-2.5 text-sm hover:brightness-110 transition-all duration-100 disabled:opacity-50"
      >
        {state === "submitting" ? "Joining..." : "Join Waitlist"}
      </button>
      {error && <p className="text-sm text-red-400 mt-1">{error}</p>}
    </form>
  );
}
