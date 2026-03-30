import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Wavebook",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-all duration-100"
        >
          &larr; Back to Wavebook
        </Link>

        <h1 className="text-3xl font-bold tracking-[-0.02em] mt-6 mb-8">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Effective date: March 16, 2026
        </p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Introduction</h2>
            <p>
              Wavebook (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the Wavebook
              application and website (wavebook.ai). This Privacy Policy explains how we collect,
              use, disclose, and safeguard your information when you use our service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Information We Collect</h2>
            <p>We collect the following types of information:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong className="text-foreground">Account information:</strong> When you sign in
                with Google, we receive your name, email address, and profile photo.
              </li>
              <li>
                <strong className="text-foreground">Surf session data:</strong> Locations, dates,
                conditions, ratings, and notes you enter about your surf sessions.
              </li>
              <li>
                <strong className="text-foreground">Phone number:</strong> If you opt in to SMS
                alerts, we store your phone number to send text notifications.
              </li>
              <li>
                <strong className="text-foreground">Usage data:</strong> We may collect information
                about how you access and use the service, including device information and log data.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Provide, maintain, and improve the Wavebook service</li>
              <li>Send you surf condition alerts via SMS (only if you opt in)</li>
              <li>Personalize your experience and provide surf predictions</li>
              <li>Respond to your inquiries and provide support</li>
              <li>Monitor usage patterns to improve our service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. SMS Messaging</h2>
            <p>
              If you provide your phone number and enable SMS alerts, we will send you text messages
              about surf conditions at your tracked spots. You can disable SMS alerts at any time in
              your account settings. Message frequency varies based on surf conditions. Standard
              message and data rates may apply.
            </p>
            <p>
              We use Twilio to deliver SMS messages. Your phone number is shared with Twilio solely
              for the purpose of delivering these messages. We do not sell your phone number or use
              it for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Data Sharing</h2>
            <p>
              We do not sell, trade, or rent your personal information. We may share your information
              only in the following circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>With service providers (e.g., Twilio for SMS, Supabase for data storage) who assist in operating our service</li>
              <li>If required by law, regulation, or legal process</li>
              <li>To protect the rights, property, or safety of Wavebook, our users, or others</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Data Security</h2>
            <p>
              We implement reasonable security measures to protect your personal information. However,
              no method of transmission over the Internet or electronic storage is 100% secure, and
              we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is active or as needed
              to provide you with our services. You may request deletion of your account and
              associated data at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your information</li>
              <li>Opt out of SMS notifications at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes
              by posting the new policy on this page and updating the effective date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">10. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at{" "}
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
