"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Trash2, Users } from "lucide-react";
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
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

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

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/spots/${spotId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to share");
      setShares((prev) => [...prev, data.share]);
      setEmail("");
      toast.success("Invite sent!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to share");
    } finally {
      setSending(false);
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

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
      accepted: "bg-green-500/15 text-green-600 dark:text-green-400",
      declined: "bg-red-500/15 text-red-600 dark:text-red-400",
    };
    return (
      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${styles[status] || ""}`}>
        {status}
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
          <p className="text-xs text-muted-foreground">{shares.length} of 5 shares used</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Invite form */}
        <form onSubmit={handleInvite} className="flex gap-2">
          <Input
            type="email"
            placeholder="Enter email address..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={sending || shares.length >= 5}
            className="flex-1"
          />
          <Button type="submit" disabled={sending || !email.trim() || shares.length >= 5} size="sm">
            {sending ? <Loader2 className="size-4 animate-spin" /> : "Invite"}
          </Button>
        </form>

        {shares.length >= 5 && (
          <p className="text-xs text-muted-foreground">Maximum 5 shares reached. Revoke one to share with someone new.</p>
        )}

        {/* Shares list */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : shares.length === 0 ? (
          <div className="text-center py-8">
            <Users className="size-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No shares yet</p>
            <p className="text-xs text-muted-foreground mt-1">Invite other Wavebook users by email.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {shares.map((share) => (
              <div
                key={share.id}
                className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {share.sharedWith?.name || share.sharedWith?.email}
                  </p>
                  {share.sharedWith?.name && (
                    <p className="text-xs text-muted-foreground truncate">{share.sharedWith.email}</p>
                  )}
                </div>
                {statusBadge(share.status)}
                <button
                  onClick={() => handleRevoke(share.id)}
                  className="rounded-md p-1.5 hover:bg-accent transition-colors text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
