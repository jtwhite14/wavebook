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

export const FAKE_SHARE_USERS = [
  { email: "alex@wavebook.test", name: "Alex Rivera" },
  { email: "jordan@wavebook.test", name: "Jordan Lee" },
];

/**
 * Get or create fake users for simulating accepted shares on the test account.
 */
export async function getOrCreateFakeShareUsers(): Promise<string[]> {
  const ids: string[] = [];
  for (const { email, name } of FAKE_SHARE_USERS) {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true },
    });
    if (existing) {
      ids.push(existing.id);
    } else {
      const id = randomUUID();
      await db.insert(users).values({
        id,
        email,
        name,
        clerkId: `test_${id}`,
      });
      ids.push(id);
    }
  }
  return ids;
}
