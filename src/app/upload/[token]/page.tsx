import { db, uploadSessions } from "@/lib/db";
import { eq, gt, and } from "drizzle-orm";
import { UploadClient } from "./UploadClient";

export default async function UploadPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Validate the upload session token
  const [session] = await db
    .select()
    .from(uploadSessions)
    .where(
      and(
        eq(uploadSessions.token, token),
        gt(uploadSessions.expiresAt, new Date())
      )
    )
    .limit(1);

  // Check if session exists and is not completed
  if (!session || session.status === "completed") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            This upload link has expired
          </h1>
          <p className="text-muted-foreground text-sm">
            Please scan a new QR code from the Wavebook dashboard to upload
            photos.
          </p>
        </div>
      </div>
    );
  }

  return <UploadClient token={token} />;
}
