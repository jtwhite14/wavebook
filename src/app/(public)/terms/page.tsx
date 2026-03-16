import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions - Wavebook",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Back to Wavebook
        </Link>

        <h1 className="text-3xl font-bold mt-6 mb-8">Terms &amp; Conditions</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Effective date: March 16, 2026
        </p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Wavebook (&quot;the Service&quot;), operated at wavebook.ai,
              you agree to be bound by these Terms &amp; Conditions. If you do not agree to these
              terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Description of Service</h2>
            <p>
              Wavebook is a surf session tracking and condition monitoring application. The Service
              allows users to log surf sessions, track surf spots, receive condition alerts, and
              view forecasts. The Service is provided &quot;as is&quot; and &quot;as available.&quot;
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. User Accounts</h2>
            <p>
              You must sign in with a Google account to use the Service. You are responsible for
              maintaining the security of your account. You agree to provide accurate and complete
              information and to keep your account information up to date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. SMS Alerts</h2>
            <p>
              The Service offers optional SMS text message alerts for surf conditions. By providing
              your phone number and enabling SMS alerts, you consent to receive automated text
              messages from Wavebook. You can opt out at any time by disabling SMS alerts in your
              account settings.
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Message frequency varies based on surf conditions at your tracked spots</li>
              <li>Standard message and data rates may apply</li>
              <li>SMS alerts are not guaranteed and may be delayed or fail due to carrier issues</li>
              <li>To opt out, disable SMS in your account settings or reply STOP to any message</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. User Content</h2>
            <p>
              You retain ownership of any content (session logs, notes, photos) you submit to the
              Service. By submitting content, you grant Wavebook a non-exclusive, worldwide,
              royalty-free license to use, store, and display that content solely for the purpose of
              providing the Service to you.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to the Service or its systems</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Scrape, crawl, or use automated means to access the Service without permission</li>
              <li>Impersonate any person or entity</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Disclaimer of Warranties</h2>
            <p>
              The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis.
              Wavebook makes no warranties, expressed or implied, regarding the Service, including
              but not limited to the accuracy of surf forecasts, condition data, or alerts.
              Surf conditions are inherently dangerous — always use your own judgment and check
              conditions in person before entering the water.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, Wavebook shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages, including but not limited to
              personal injury, property damage, or loss of data, arising out of or relating to your
              use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your access to the Service at any time,
              with or without cause. You may stop using the Service at any time. Upon termination,
              your right to use the Service will immediately cease.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">10. Changes to Terms</h2>
            <p>
              We may modify these Terms at any time. We will notify you of material changes by
              posting the updated terms on this page and updating the effective date. Your continued
              use of the Service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">11. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the
              State of Maine, United States, without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">12. Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us at{" "}
              <a href="mailto:support@wavebook.ai" className="text-primary hover:underline">
                support@wavebook.ai
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
