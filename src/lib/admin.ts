import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export const ADMIN_EMAILS = ["jtwhite14@gmail.com", "jt@withforerunner.com"];
export const TEST_USER_EMAIL = "demo@wavebook.test";
export const TEST_MODE_COOKIE = "wavebook-test-mode";

export async function isAdmin(userId: string): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { email: true },
  });
  return !!user?.email && ADMIN_EMAILS.includes(user.email);
}

/**
 * Get or create the test/demo user for impersonation.
 */
export async function getOrCreateTestUser(): Promise<string> {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, TEST_USER_EMAIL),
    columns: { id: true },
  });
  if (existing) return existing.id;

  const id = randomUUID();
  await db.insert(users).values({
    id,
    email: TEST_USER_EMAIL,
    name: "Demo Surfer",
    clerkId: `test_${id}`,
  });
  return id;
}
