"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, Loader2, Link2, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import type { SpotShareResponse } from "@/types";

interface SpotSharePanelProps {
  spotId: string;
  spotName: string;
  onBack: () => void;
}

export function SpotSharePanel({ spotId, spotName, onBack }: SpotSharePanelProps) {
  const [shares, setShares] = useState<SpotShareResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingSlot, setCreatingSlot] = useState<number | null>(null);

  const claimedCount = shares.filter((s) => s.sharedWithUserId !== null).length;

  const fetchShares = useCallback(async () => {
    try {
      const res = await fetch(`/api/spots/${spotId}/shares`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setShares(data.shares || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [spotId]);

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  const handleCreateLink = async (slotIndex: number) => {
    setCreatingSlot(slotIndex);
    try {
      const res = await fetch(`/api/spots/${spotId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create link");
      setShares((prev) => [...prev, data.share]);
      await copyShareLink(data.share.inviteUrl, spotName);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create link");
    } finally {
      setCreatingSlot(null);
    }
  };

  const handleRevoke = async (shareId: string) => {
    try {
      const res = await fetch(`/api/spots/${spotId}/shares/${shareId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setShares((prev) => prev.filter((s) => s.id !== shareId));
      toast.success("Share revoked");
    } catch {
      toast.error("Failed to revoke share");
    }
  };

  const statusBadge = (share: SpotShareResponse) => {
    if (!share.sharedWithUserId) {
      return (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400">
          link created
        </span>
      );
    }
    const styles: Record<string, string> = {
      pending: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
      accepted: "bg-green-500/15 text-green-600 dark:text-green-400",
      declined: "bg-red-500/15 text-red-600 dark:text-red-400",
    };
    return (
      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${styles[share.status] || ""}`}>
        {share.status}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b">
        <button
          onClick={onBack}
          className="rounded-md p-1.5 hover:bg-accent transition-colors"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold truncate">Share {spotName}</h2>
          <p className="text-xs text-muted-foreground">{claimedCount} of 5 shares used</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          Array.from({ length: 5 }).map((_, i) => {
            const share = shares[i];
            return share ? (
              <div
                key={share.id}
                className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
              >
                <div className="flex items-center justify-center size-8 rounded-full bg-accent shrink-0">
                  <User className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  {share.sharedWith ? (
                    <>
                      <p className="text-sm font-medium truncate">
                        {share.sharedWith.name || share.sharedWith.email}
                      </p>
                      {share.sharedWith.name && (
                        <p className="text-xs text-muted-foreground truncate">{share.sharedWith.email}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground truncate">Unclaimed link</p>
                  )}
                </div>
                {statusBadge(share)}
                {share.inviteUrl && !share.sharedWithUserId && (
                  <button
                    onClick={() => copyShareLink(share.inviteUrl!, spotName)}
                    className="rounded-md p-1.5 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                    title="Copy link"
                  >
                    <Copy className="size-3.5" />
                  </button>
                )}
                <button
                  onClick={() => handleRevoke(share.id)}
                  className="rounded-md p-1.5 hover:bg-accent transition-colors text-muted-foreground hover:text-destructive"
                  title="Revoke share"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ) : (
              <div
                key={`empty-${i}`}
                className="flex items-center gap-3 rounded-lg border border-dashed px-3 py-2.5"
              >
                <div className="flex items-center justify-center size-8 rounded-full bg-accent/50 shrink-0">
                  <User className="size-4 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground/60 flex-1">Friend {i + 1}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCreateLink(i)}
                  disabled={creatingSlot !== null}
                  className="gap-1.5 h-7 text-xs"
                >
                  {creatingSlot === i ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Link2 className="size-3" />
                  )}
                  Generate Invite Link
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

async function copyShareLink(url: string, spotName: string) {
  const text = `You've been invited to ${spotName}: ${url}`;
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Link copied to clipboard!");
  } catch {
    toast.error("Failed to copy link");
  }
}
