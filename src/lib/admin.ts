import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";

export const ADMIN_EMAILS = ["jtwhite14@gmail.com", "jt@withforerunner.com"];

export async function isAdmin(userId: string): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { email: true },
  });
  return !!user?.email && ADMIN_EMAILS.includes(user.email);
}
