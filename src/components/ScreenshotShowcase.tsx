"use client";

import Image from "next/image";
import { useState } from "react";

function Placeholder({ label }: { label: string }) {
  return (
    <div className="w-full aspect-[16/10] rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

function Screenshot({
  src,
  alt,
  priority = false,
}: {
  src: string;
  alt: string;
  priority?: boolean;
}) {
  const [error, setError] = useState(false);

  if (error) {
    return <Placeholder label={alt} />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={1920}
      height={1200}
      priority={priority}
      className="w-full rounded-xl border border-white/[0.08]"
      onError={() => setError(true)}
    />
  );
}

export function HeroScreenshot() {
  return (
    <section className="pb-24 md:pb-32 -mt-8">
      <div className="max-w-5xl mx-auto px-6">
        <div
          className="relative"
          style={{ perspective: "2200px" }}
        >
          {/* Glow effect behind the screenshot */}
          <div className="absolute inset-0 -inset-x-12 -top-8 bg-primary/[0.04] rounded-3xl blur-3xl" />

          <div
            className="relative"
            style={{
              transform: "rotateX(12deg) scale(0.98)",
              transformOrigin: "center bottom",
            }}
          >
            {/* Screenshot with layered shadows */}
            <div
              className="relative rounded-xl overflow-hidden shadow-2xl"
              style={{
                boxShadow:
                  "0 25px 50px -12px rgba(0,0,0,0.5), 0 80px 120px -40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)",
              }}
            >
              {/* Browser chrome bar */}
              <div className="bg-white/[0.06] border-b border-white/[0.06] px-4 py-2.5 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/[0.12]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/[0.12]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/[0.12]" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-white/[0.06] rounded-md px-4 py-1 text-[11px] text-muted-foreground">
                    wavebook.app
                  </div>
                </div>
                <div className="w-[52px]" />
              </div>

              <Screenshot
                src="/screenshots/dashboard.png"
                alt="Dashboard — your spots and live conditions"
                priority
              />
            </div>
          </div>

          {/* Bottom fade into background */}
          <div
            className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
            style={{
              background:
                "linear-gradient(to top, var(--background) 0%, transparent 100%)",
            }}
          />
        </div>
      </div>
    </section>
  );
}

export function FeatureScreenshots() {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Session detail */}
          <div className="space-y-4">
            <div
              className="relative rounded-xl overflow-hidden"
              style={{
                boxShadow:
                  "0 25px 60px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
              }}
            >
              <Screenshot
                src="/screenshots/session-detail.png"
                alt="Session detail with conditions and notes"
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Every session, logged with conditions and notes.
            </p>
          </div>

          {/* Sessions list */}
          <div className="space-y-4 md:mt-16">
            <div
              className="relative rounded-xl overflow-hidden"
              style={{
                boxShadow:
                  "0 25px 60px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
              }}
            >
              <Screenshot
                src="/screenshots/sessions.png"
                alt="Session history — your personal logbook"
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Your personal surf logbook, always private.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
