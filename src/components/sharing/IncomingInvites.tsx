"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface Invite {
  id: string;
  inviteCode: string;
  spot: { id: string; name: string };
  sharedBy: { id: string; name: string | null; email: string };
}

interface IncomingInvitesProps {
  invites: Invite[];
  onResolved: (inviteId: string, action: "accept" | "decline") => void;
}

export function IncomingInvites({ invites, onResolved }: IncomingInvitesProps) {
  const [responding, setResponding] = useState<string | null>(null);

  if (invites.length === 0) return null;

  const handleRespond = async (invite: Invite, action: "accept" | "decline") => {
    setResponding(invite.id);
    try {
      const res = await fetch("/api/shares/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: invite.inviteCode, action }),
      });
      if (!res.ok) throw new Error();
      onResolved(invite.id, action);
      toast.success(action === "accept" ? `Now viewing ${invite.spot.name}` : "Invite declined");
    } catch {
      toast.error("Failed to respond to invite");
    } finally {
      setResponding(null);
    }
  };

  return (
    <div className="rounded-lg border border-primary/30 bg-background/95 backdrop-blur-sm shadow-lg p-4">
      <p className="text-sm font-medium mb-3">
        {invites.length === 1 ? "1 spot shared with you" : `${invites.length} spots shared with you`}
      </p>
      <div className="space-y-2">
        {invites.map((invite) => (
          <div key={invite.id} className="flex items-center gap-3 rounded-md border px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{invite.spot.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                from {invite.sharedBy.name || invite.sharedBy.email}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                disabled={responding === invite.id}
                onClick={() => handleRespond(invite, "decline")}
              >
                {responding === invite.id ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <X className="size-3" />
                )}
              </Button>
              <Button
                size="icon"
                className="size-7"
                disabled={responding === invite.id}
                onClick={() => handleRespond(invite, "accept")}
              >
                {responding === invite.id ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Check className="size-3" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
