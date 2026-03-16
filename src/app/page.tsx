import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-secondary">
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-lg">
          <div className="text-6xl mb-6">🏄</div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">Wavebook</h1>
          <p className="text-muted-foreground text-lg mb-10">
            Track your surf sessions, monitor conditions, and get alerts when the waves are right.
          </p>

          <div className="flex flex-col gap-3 items-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground font-medium px-8 py-3 text-sm hover:bg-primary/90 transition-colors w-full max-w-xs"
            >
              Log In
            </Link>
          </div>
        </div>
      </main>

      <footer className="py-8 text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-6">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <span className="text-border">|</span>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms &amp; Conditions
          </Link>
        </div>
        <p className="mt-3">&copy; {new Date().getFullYear()} Wavebook. All rights reserved.</p>
      </footer>
    </div>
  );
}
