"use client";

import Image from "next/image";
import { useState } from "react";
import { formatDate, formatTime } from "@/lib/utils/date";
import { formatWaveHeight, formatWindSpeed } from "@/lib/api/open-meteo";

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

export interface SessionPhotoData {
  photoUrl: string;
  spotName: string | null;
  rating: number;
  date: string;
  startTime: string;
  endTime: string | null;
  notes: string | null;
  waveHeight: string | null;
  swellPeriod: string | null;
  windSpeed: string | null;
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`w-3.5 h-3.5 ${
            i < rating ? "text-yellow-400" : "text-muted-foreground/30"
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function SessionCard({
  photo,
  compact = false,
}: {
  photo: SessionPhotoData;
  compact?: boolean;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <article className="bg-card rounded-xl overflow-hidden border border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">
              {photo.spotName?.charAt(0)?.toUpperCase() ?? "S"}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">
              {photo.spotName ?? "Secret Spot"}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(photo.date)}
            </p>
          </div>
        </div>
        <Stars rating={photo.rating} />
      </div>

      {/* Photo */}
      {imgError ? (
        <div className="aspect-[4/3] bg-gradient-to-br from-blue-600/20 via-cyan-500/15 to-teal-400/20" />
      ) : (
        <div className="relative aspect-[4/3] bg-muted overflow-hidden">
          <img
            src={photo.photoUrl}
            alt={`Session at ${photo.spotName ?? "secret spot"}`}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 space-y-2">
        {/* Condition pills */}
        {(photo.waveHeight || photo.swellPeriod || photo.windSpeed) && (
          <div className="flex flex-wrap gap-2 text-xs">
            {photo.waveHeight && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 font-medium">
                {formatWaveHeight(parseFloat(photo.waveHeight))}
              </span>
            )}
            {photo.swellPeriod && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 font-medium">
                {parseFloat(photo.swellPeriod).toFixed(0)}s
              </span>
            )}
            {photo.windSpeed && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-500/15 text-gray-400 font-medium">
                {formatWindSpeed(parseFloat(photo.windSpeed))}
              </span>
            )}
          </div>
        )}

        {/* Time */}
        <p className="text-xs text-muted-foreground">
          {formatTime(photo.startTime)}
          {photo.endTime && ` - ${formatTime(photo.endTime)}`}
        </p>

        {/* Notes (only on non-compact) */}
        {!compact && photo.notes && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {photo.notes}
          </p>
        )}
      </div>
    </article>
  );
}

export function FeatureScreenshots({
  photos,
}: {
  photos?: SessionPhotoData[];
}) {
  const hasPhotos = photos && photos.length > 0;

  // Split: first photo gets the big left card, rest go in the right grid
  const featured = hasPhotos ? photos[0] : null;
  const grid = hasPhotos ? photos.slice(1, 5) : [];

  return (
    <section className="py-24 md:py-32">
      <div className="max-w-5xl mx-auto px-6">
        {hasPhotos ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Featured session */}
            <div className="space-y-4">
              <div
                className="relative rounded-xl overflow-hidden"
                style={{
                  boxShadow:
                    "0 25px 60px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
                }}
              >
                <SessionCard photo={featured!} />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Every session, logged with conditions and notes.
              </p>
            </div>

            {/* Session grid */}
            <div className="space-y-4 md:mt-16">
              <div
                className="relative rounded-xl overflow-hidden"
                style={{
                  boxShadow:
                    "0 25px 60px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
                }}
              >
                <div className="grid grid-cols-2 gap-3 p-3 bg-card rounded-xl border border-border/50">
                  {grid.map((photo) => (
                    <SessionCard
                      key={photo.photoUrl}
                      photo={photo}
                      compact
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Your personal surf logbook, always private.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Fallback: static screenshots */}
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
        )}
      </div>
    </section>
  );
}
