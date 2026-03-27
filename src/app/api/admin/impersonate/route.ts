import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { ADMIN_EMAILS, TEST_MODE_COOKIE, getOrCreateTestUser } from "@/lib/admin";

async function verifyAdmin(): Promise<boolean> {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return false;

  // Look up the user by clerkId to check email
  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkUserId),
    columns: { email: true },
  });
  return !!user?.email && ADMIN_EMAILS.includes(user.email);
}

export async function POST() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const testUserId = await getOrCreateTestUser();
  const cookieStore = await cookies();
  cookieStore.set(TEST_MODE_COOKIE, testUserId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return NextResponse.json({ active: true });
}

export async function DELETE() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cookieStore = await cookies();
  cookieStore.delete(TEST_MODE_COOKIE);

  return NextResponse.json({ active: false });
}

export async function GET() {
  const cookieStore = await cookies();
  const active = !!cookieStore.get(TEST_MODE_COOKIE)?.value;
  return NextResponse.json({ active });
}
