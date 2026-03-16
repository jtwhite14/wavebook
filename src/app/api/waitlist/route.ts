import { NextRequest, NextResponse } from "next/server";
import { db, waitlist } from "@/lib/db";
import { z } from "zod";
import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const waitlistSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = waitlistSchema.parse(body);

    try {
      await db.insert(waitlist).values({ email });
    } catch (err: unknown) {
      // Handle duplicate email gracefully (unique constraint violation)
      const isDuplicate =
        err instanceof Error && err.message.includes("unique");
      if (!isDuplicate) throw err;
    }

    // Send notification email (fire and forget — don't block response on this)
    await getResend().emails.send({
      from: "onboarding@resend.dev",
      to: "jtwhite14@gmail.com",
      subject: "New Wavebook waitlist signup",
      text: `New waitlist signup: ${email}`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }
    console.error("Waitlist signup error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
