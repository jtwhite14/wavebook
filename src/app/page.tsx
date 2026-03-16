import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { WaitlistForm } from "@/components/WaitlistForm";
import {
  HeroScreenshot,
  FeatureScreenshots,
} from "@/components/ScreenshotShowcase";
import {
  MapPin,
  BookOpen,
  Waves,
  MessageSquare,
  Calendar,
  Users,
  Brain,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: MapPin,
    title: "Spot Tracking",
    description:
      "Pin your spots on a private map. Nobody sees them but you. Not your buddies, not the algorithm, not some kook with a blog.",
  },
  {
    icon: BookOpen,
    title: "Session Logging",
    description:
      "Log every damn session — conditions, board, rating, notes. Build a record of your wave life that actually means something.",
  },
  {
    icon: Waves,
    title: "Live Conditions",
    description:
      "Real-time swell, wind, and tide for every saved spot. Stop refreshing three different apps like a psycho.",
  },
  {
    icon: Brain,
    title: "AI Forecast Scoring",
    description:
      "Wavebook learns what gets you stoked. It scores every forecast against your session history so you stop guessing and start going.",
  },
  {
    icon: MessageSquare,
    title: "Smart SMS Alerts",
    description:
      "Wake up to a text that says \"get your ass to Rincon.\" AI matches conditions to your best sessions. No fiddling with thresholds.",
  },
  {
    icon: Calendar,
    title: "Weekly Forecast",
    description:
      "7-day forecast scored against your personal data. Know exactly which days are worth calling in sick for.",
  },
  {
    icon: Sparkles,
    title: "Condition Profiles",
    description:
      "Tell Wavebook what your dream session looks like. It'll watch the forecasts and ping you when the ocean delivers.",
  },
  {
    icon: Users,
    title: "Spot Sharing",
    description:
      "Share a spot with up to 5 people. That's it. No groups, no communities, no bull.",
  },
];

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-background/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between h-14">
          <span className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <BookOpen className="h-5 w-5 text-primary" />
            Wavebook
          </span>
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Log In
          </Link>
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero */}
        <section className="py-28 md:py-36">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
              Your waves. Your data.
              <br />
              Keep it that way.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
              An AI-powered surf tracker that actually gives a damn about
              privacy. Log sessions, score forecasts against your wave history,
              and get alerts when it&apos;s going off — without blowing up your
              spots.
            </p>
            <div className="mt-10">
              <WaitlistForm />
            </div>
          </div>
        </section>

        {/* Hero Screenshot */}
        <HeroScreenshot />

        {/* Philosophy */}
        <section className="py-24 md:py-32">
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Because the best spots stay secret.
            </h2>
            <div className="mt-6 space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Every surf app out there wants you to share, post, check in, and
                rat out your lineup. Screw that. We built Wavebook for surfers
                who want to get better without putting their spots on blast.
              </p>
              <p>
                Wavebook learns what makes a great session{" "}
                <span className="text-foreground">for you</span> — not some
                average across a million kooks. It cross-references swell, wind,
                tide, and weather against your logged sessions, scores every
                forecast window, and texts you when it&apos;s time to paddle
                out. Your data trains your model. Nobody else&apos;s.
              </p>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 md:py-32">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-center">
              Built for surfers, not influencers.
            </h2>
            <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-6"
                >
                  <feature.icon className="h-5 w-5 text-primary mb-3" />
                  <h3 className="font-semibold text-sm">{feature.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* App Screenshots */}
        <FeatureScreenshots />

        {/* Privacy Commitment */}
        <section className="py-24 md:py-32">
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              No leaderboards. No check-ins.
              <br />
              No damn crowds.
            </h2>
            <ul className="mt-8 space-y-4 text-muted-foreground leading-relaxed">
              <li className="flex gap-3">
                <span className="text-primary mt-1 shrink-0">—</span>
                Your spots never show up on public maps or feeds. Ever. We&apos;d
                rather shut down than sell you out.
              </li>
              <li className="flex gap-3">
                <span className="text-primary mt-1 shrink-0">—</span>
                No followers, no likes, no clout metrics. This isn&apos;t a
                social network — it&apos;s a tool for people who actually surf.
              </li>
              <li className="flex gap-3">
                <span className="text-primary mt-1 shrink-0">—</span>
                Share a spot with up to 5 people you&apos;d actually trust in
                heavy surf. Everyone else can kick rocks.
              </li>
            </ul>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-24 md:py-32">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Stop checking Surfline. Start surfing.
            </h2>
            <div className="mt-8">
              <WaitlistForm />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-6">
          <Link
            href="/privacy"
            className="hover:text-foreground transition-colors"
          >
            Privacy Policy
          </Link>
          <span className="text-border">|</span>
          <Link
            href="/terms"
            className="hover:text-foreground transition-colors"
          >
            Terms &amp; Conditions
          </Link>
        </div>
        <p className="mt-3">
          &copy; {new Date().getFullYear()} Wavebook. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
