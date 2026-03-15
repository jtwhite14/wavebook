"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ConditionWeights,
  DEFAULT_CONDITION_WEIGHTS,
  WEIGHT_PRESETS,
  CardinalDirection,
  PreferredWaveSize,
  PreferredSwellPeriod,
  PreferredWind,
} from "@/types";
import { SwellExposurePicker } from "@/components/spots/SwellExposurePicker";

interface AlertTuningSectionProps {
  spotId: string;
  onSave?: (weights: ConditionWeights) => void;
}

export function AlertTuningSection({ spotId, onSave }: AlertTuningSectionProps) {
  const [weights, setWeights] = useState<ConditionWeights>(DEFAULT_CONDITION_WEIGHTS);
  const [loading, setLoading] = useState(true);
  const [activePreset, setActivePreset] = useState<string | null>("allAround");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/spots/${spotId}/weights`)
      .then(r => r.ok ? r.json() : { weights: DEFAULT_CONDITION_WEIGHTS })
      .then(data => {
        setWeights(data.weights);
        setActivePreset(detectPreset(data.weights));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [spotId]);

  function detectPreset(w: ConditionWeights): string | null {
    for (const [key, preset] of Object.entries(WEIGHT_PRESETS)) {
      const pw = preset.weights;
      if (
        pw.swellHeight === w.swellHeight &&
        pw.swellPeriod === w.swellPeriod &&
        pw.swellDirection === w.swellDirection &&
        pw.tideHeight === w.tideHeight &&
        pw.windSpeed === w.windSpeed &&
        pw.windDirection === w.windDirection
      ) {
        return key;
      }
    }
    return null;
  }

  async function applyPreset(presetKey: string) {
    const preset = WEIGHT_PRESETS[presetKey];
    if (!preset) return;
    const newWeights: ConditionWeights = {
      ...DEFAULT_CONDITION_WEIGHTS,
      ...preset.weights,
    };
    setWeights(newWeights);
    setActivePreset(presetKey);
    await saveWeights(newWeights);
  }

  async function saveWeights(w: ConditionWeights = weights) {
    try {
      const res = await fetch(`/api/spots/${spotId}/weights`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(w),
      });
      if (!res.ok) throw new Error();
      onSave?.(w);
    } catch {
      toast.error("Failed to save alert preferences");
    }
  }

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function debouncedSave(newWeights: ConditionWeights) {
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveWeights(newWeights), 700);
  }

  function handleWeightChange(key: keyof ConditionWeights, level: number) {
    const value = level === 0 ? 0.3 : level === 1 ? 0.6 : 1.0;
    const newWeights = { ...weights, [key]: value };

    // Clear follow-up preference when weight drops to "Not very"
    if (level === 0) {
      if (key === "swellHeight") newWeights.preferredWaveSize = undefined;
      if (key === "swellPeriod") newWeights.preferredSwellPeriod = undefined;
      if (key === "windSpeed") newWeights.preferredWind = undefined;
      if (key === "tideHeight") newWeights.preferredTide = "any";
    }

    setWeights(newWeights);
    setActivePreset(null);
    debouncedSave(newWeights);
  }

  function handlePreferenceChange<K extends keyof ConditionWeights>(
    key: K,
    value: ConditionWeights[K] | undefined,
  ) {
    const newWeights = { ...weights, [key]: value };
    setWeights(newWeights);
    setActivePreset(null);
    debouncedSave(newWeights);
  }

  function handleExposureChange(directions: CardinalDirection[]) {
    const newWeights = { ...weights, swellExposure: directions.length > 0 ? directions : undefined };
    setWeights(newWeights);
    debouncedSave(newWeights);
  }

  function weightToLevel(value: number): number {
    if (value <= 0.45) return 0;
    if (value <= 0.8) return 1;
    return 2;
  }

  if (loading) {
    return <div className="py-2 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  const swellHeightLevel = weightToLevel(weights.swellHeight);
  const swellPeriodLevel = weightToLevel(weights.swellPeriod);
  const swellDirLevel = weightToLevel(weights.swellDirection);
  const windSpeedLevel = weightToLevel(weights.windSpeed);
  const tideLevel = weightToLevel(weights.tideHeight);

  return (
    <div className="space-y-3">
      {/* Presets */}
      <div>
        <label className="text-sm font-medium mb-1.5 block">Spot type</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(WEIGHT_PRESETS).map(([key, preset]) => (
            <Button
              key={key}
              variant={activePreset === key ? "default" : "outline"}
              size="sm"
              onClick={() => applyPreset(key)}
              className="text-xs"
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Customize weights */}
      <div className="space-y-1">
        <label className="text-sm font-medium block">Customize</label>

        {/* Wave size */}
        <WeightRow
          label="How important is wave size?"
          value={swellHeightLevel}
          onChange={level => handleWeightChange("swellHeight", level)}
        />
        <FollowUpRow
          visible={swellHeightLevel >= 1}
          label="What size waves?"
          options={[
            { value: "small", label: "Small (<3ft)" },
            { value: "medium", label: "Medium (3–6ft)" },
            { value: "large", label: "Large (6–10ft)" },
            { value: "xl", label: "XL (10ft+)" },
          ]}
          selected={weights.preferredWaveSize}
          onChange={(v) => handlePreferenceChange("preferredWaveSize", v as PreferredWaveSize | undefined)}
        />

        {/* Swell period */}
        <WeightRow
          label="How important is swell period?"
          value={swellPeriodLevel}
          onChange={level => handleWeightChange("swellPeriod", level)}
        />
        <FollowUpRow
          visible={swellPeriodLevel >= 1}
          label="What swell period?"
          options={[
            { value: "short", label: "Short (<8s)" },
            { value: "medium", label: "Medium (8–12s)" },
            { value: "long", label: "Long (12s+)" },
          ]}
          selected={weights.preferredSwellPeriod}
          onChange={(v) => handlePreferenceChange("preferredSwellPeriod", v as PreferredSwellPeriod | undefined)}
        />

        {/* Swell direction */}
        <WeightRow
          label="How important is swell direction?"
          value={swellDirLevel}
          onChange={level => handleWeightChange("swellDirection", level)}
        />
        {swellDirLevel >= 1 && (
          <div className="pl-1 pb-1">
            <SwellExposurePicker
              value={weights.swellExposure ?? []}
              onChange={handleExposureChange}
            />
          </div>
        )}

        {/* Wind */}
        <WeightRow
          label="How important is wind?"
          value={windSpeedLevel}
          onChange={level => handleWeightChange("windSpeed", level)}
        />
        <FollowUpRow
          visible={windSpeedLevel >= 1}
          label="What wind conditions?"
          options={[
            { value: "glassy", label: "Light/Glassy" },
            { value: "offshore", label: "Offshore" },
            { value: "cross-offshore", label: "Cross-offshore" },
            { value: "onshore", label: "Onshore" },
          ]}
          selected={weights.preferredWind}
          onChange={(v) => handlePreferenceChange("preferredWind", v as PreferredWind | undefined)}
        />

        {/* Wind direction */}
        <WeightRow
          label="How important is wind direction?"
          value={weightToLevel(weights.windDirection)}
          onChange={level => handleWeightChange("windDirection", level)}
        />

        {/* Tide */}
        <WeightRow
          label="How important is tide?"
          value={tideLevel}
          onChange={level => handleWeightChange("tideHeight", level)}
        />
        <FollowUpRow
          visible={tideLevel >= 1}
          label="Best tide?"
          options={[
            { value: "any", label: "Any" },
            { value: "low", label: "Low" },
            { value: "mid", label: "Mid" },
            { value: "high", label: "High" },
            { value: "incoming", label: "Incoming" },
            { value: "outgoing", label: "Outgoing" },
          ]}
          selected={weights.preferredTide}
          onChange={(v) => handlePreferenceChange("preferredTide", (v ?? "any") as ConditionWeights["preferredTide"])}
        />
      </div>
    </div>
  );
}

function WeightRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (level: number) => void;
}) {
  const levels = ["Not very", "Somewhat", "Very"];
  return (
    <div className="pt-2">
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <div className="flex gap-1">
        {levels.map((text, i) => (
          <button
            key={i}
            onClick={() => onChange(i)}
            className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              value === i
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function FollowUpRow({
  visible,
  label,
  options,
  selected,
  onChange,
}: {
  visible: boolean;
  label: string;
  options: { value: string; label: string }[];
  selected: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <div
      className={`overflow-hidden transition-all duration-200 ${
        visible ? "max-h-24 opacity-100" : "max-h-0 opacity-0"
      }`}
    >
      <div className="pl-1 pt-1 pb-1">
        <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
        <div className="flex flex-wrap gap-1">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange(selected === opt.value ? undefined : opt.value)}
              className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                selected === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
