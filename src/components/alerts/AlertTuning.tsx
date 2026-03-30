"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { ChevronRight } from "lucide-react";
import {
  ConditionWeights,
  DEFAULT_CONDITION_WEIGHTS,
  WEIGHT_PRESETS,
  CardinalDirection,
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
        // Migrate legacy single-value preferences to arrays
        const w = { ...data.weights };
        if (w.preferredWaveSize && !Array.isArray(w.preferredWaveSize)) {
          w.preferredWaveSize = [w.preferredWaveSize];
        }
        if (w.preferredSwellPeriod && !Array.isArray(w.preferredSwellPeriod)) {
          w.preferredSwellPeriod = [w.preferredSwellPeriod];
        }
        if (w.preferredWind && !Array.isArray(w.preferredWind)) {
          w.preferredWind = [w.preferredWind];
        }
        // Migrate legacy single-value tide preference to array
        if (w.preferredTide && typeof w.preferredTide === 'string') {
          w.preferredTide = w.preferredTide === 'any' ? undefined : [w.preferredTide];
        }
        setWeights(w);
        setActivePreset(detectPreset(w));
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
    const value = level === 0 ? 0.3 : level === 1 ? 0.6 : level === 2 ? 1.0 : level === 3 ? 1.5 : 0;
    const newWeights = { ...weights, [key]: value };

    // Clear follow-up preference when weight is "Not very" or "I don't know"
    if (level === 0 || level === 4) {
      if (key === "swellHeight") newWeights.preferredWaveSize = undefined;
      if (key === "swellPeriod") newWeights.preferredSwellPeriod = undefined;
      if (key === "windSpeed") newWeights.preferredWind = undefined;
      if (key === "windDirection") newWeights.preferredWindDirections = undefined;
      if (key === "tideHeight") newWeights.preferredTide = undefined;
    }

    setWeights(newWeights);
    setActivePreset(null);
    debouncedSave(newWeights);
  }

  function handleSmartPreferenceChange(
    preferenceKey: "preferredWaveSize" | "preferredSwellPeriod" | "preferredWind" | "preferredTide",
    importanceKey: "swellHeight" | "swellPeriod" | "windSpeed" | "tideHeight",
    value: string,
  ) {
    const current = (weights[preferenceKey] as string[] | undefined) ?? [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    const newWeights: ConditionWeights = {
      ...weights,
      [preferenceKey]: updated.length > 0 ? updated : undefined,
    };

    // Auto-bump importance from "I don't know" (0) to "Somewhat" (0.6)
    // when user is actively selecting preferences
    if (updated.length > 0 && weights[importanceKey] === 0) {
      (newWeights as unknown as Record<string, unknown>)[importanceKey] = 0.6;
    }

    setWeights(newWeights);
    setActivePreset(null);
    debouncedSave(newWeights);
  }

  function handleExposureChange(directions: CardinalDirection[]) {
    const newWeights: ConditionWeights = {
      ...weights,
      swellExposure: directions.length > 0 ? directions : undefined,
    };
    // Auto-bump swell direction importance
    if (directions.length > 0 && weights.swellDirection === 0) {
      newWeights.swellDirection = 0.6;
    }
    setWeights(newWeights);
    debouncedSave(newWeights);
  }

  function handleWindDirectionChange(directions: CardinalDirection[]) {
    const newWeights: ConditionWeights = {
      ...weights,
      preferredWindDirections: directions.length > 0 ? directions : undefined,
    };
    // Auto-bump wind direction importance
    if (directions.length > 0 && weights.windDirection === 0) {
      newWeights.windDirection = 0.6;
    }
    setWeights(newWeights);
    debouncedSave(newWeights);
  }

  function weightToLevel(value: number): number {
    if (value === 0) return 4; // I don't know
    if (value <= 0.45) return 0;
    if (value <= 0.8) return 1;
    if (value <= 1.2) return 2;
    return 3; // Critical
  }

  if (loading) {
    return <div className="py-2 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  const swellHeightLevel = weightToLevel(weights.swellHeight);
  const swellPeriodLevel = weightToLevel(weights.swellPeriod);
  const swellDirLevel = weightToLevel(weights.swellDirection);
  const windSpeedLevel = weightToLevel(weights.windSpeed);
  const windDirLevel = weightToLevel(weights.windDirection);
  const tideLevel = weightToLevel(weights.tideHeight);

  return (
    <div className="space-y-3">
      {/* Spot type presets */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Spot type</label>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(WEIGHT_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-100 ${
                activePreset === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {/* Swell section */}
        <TuningSection
          title="Swell"
          summary={getSwellSummary(weights)}
          defaultOpen
        >
          <PreferenceGroup
            label="Wave size"
            importance={swellHeightLevel}
            onImportanceChange={(level) => handleWeightChange("swellHeight", level)}
            options={[
              { value: "small", label: "Small (<3ft)" },
              { value: "medium", label: "Medium (3–6ft)" },
              { value: "large", label: "Large (6–10ft)" },
              { value: "xl", label: "XL (10ft+)" },
            ]}
            selected={weights.preferredWaveSize ?? []}
            onSelect={(v) => handleSmartPreferenceChange("preferredWaveSize", "swellHeight", v)}
          />
          <PreferenceGroup
            label="Period"
            importance={swellPeriodLevel}
            onImportanceChange={(level) => handleWeightChange("swellPeriod", level)}
            options={[
              { value: "short", label: "Short (<8s)" },
              { value: "medium", label: "Medium (8–12s)" },
              { value: "long", label: "Long (12s+)" },
            ]}
            selected={weights.preferredSwellPeriod ?? []}
            onSelect={(v) => handleSmartPreferenceChange("preferredSwellPeriod", "swellPeriod", v)}
          />
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-muted-foreground">Exposure</span>
              <ImportanceDots value={swellDirLevel} onChange={(level) => handleWeightChange("swellDirection", level)} />
            </div>
            <SwellExposurePicker
              value={weights.swellExposure ?? []}
              onChange={handleExposureChange}
            />
          </div>
        </TuningSection>

        {/* Wind section */}
        <TuningSection
          title="Wind"
          summary={getWindSummary(weights)}
        >
          <PreferenceGroup
            label="Conditions"
            importance={windSpeedLevel}
            onImportanceChange={(level) => handleWeightChange("windSpeed", level)}
            options={[
              { value: "glassy", label: "Light/Glassy" },
              { value: "offshore", label: "Offshore" },
              { value: "cross-offshore", label: "Cross-offshore" },
              { value: "onshore", label: "Onshore" },
            ]}
            selected={weights.preferredWind ?? []}
            onSelect={(v) => handleSmartPreferenceChange("preferredWind", "windSpeed", v)}
          />
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-muted-foreground">Direction</span>
              <ImportanceDots value={windDirLevel} onChange={(level) => handleWeightChange("windDirection", level)} />
            </div>
            <WindDirectionPicker
              value={weights.preferredWindDirections ?? []}
              onChange={handleWindDirectionChange}
            />
          </div>
        </TuningSection>

        {/* Tide section */}
        <TuningSection
          title="Tide"
          summary={getTideSummary(weights)}
        >
          <PreferenceGroup
            label="Preferred tide"
            importance={tideLevel}
            onImportanceChange={(level) => handleWeightChange("tideHeight", level)}
            options={[
              { value: "low", label: "Low" },
              { value: "mid", label: "Mid" },
              { value: "high", label: "High" },
              { value: "incoming", label: "Incoming" },
              { value: "outgoing", label: "Outgoing" },
            ]}
            selected={weights.preferredTide ?? []}
            onSelect={(v) => handleSmartPreferenceChange("preferredTide", "tideHeight", v)}
          />
        </TuningSection>
      </div>
    </div>
  );
}

// --- Sub-components ---

function TuningSection({
  title,
  summary,
  children,
  defaultOpen = false,
}: {
  title: string;
  summary: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border overflow-hidden">
      <button
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/50 transition-all duration-100"
        onClick={() => setOpen(!open)}
      >
        <ChevronRight className={`size-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
        <span className="text-sm font-medium flex-1">{title}</span>
        {!open && (
          <span className="text-xs text-muted-foreground truncate max-w-[250px]">{summary}</span>
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 space-y-4 border-t">
          {children}
        </div>
      )}
    </div>
  );
}

function PreferenceGroup({
  label,
  importance,
  onImportanceChange,
  options,
  selected,
  onSelect,
}: {
  label: string;
  importance: number;
  onImportanceChange: (level: number) => void;
  options: { value: string; label: string }[];
  selected: string[];
  onSelect: (value: string) => void;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <ImportanceDots value={importance} onChange={onImportanceChange} />
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const isSelected = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              onClick={() => onSelect(opt.value)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-100 ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ImportanceDots({
  value,
  onChange,
}: {
  value: number; // 0 = low, 1 = medium, 2 = high, 3 = critical, 4 = any/idk
  onChange: (level: number) => void;
}) {
  const labels = ["Low", "Med", "High", "Critical", "Any"];

  function handleClick(level: number, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(level);
  }

  return (
    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
      {[0, 1, 2, 3, 4].map(level => {
        const isActive = value === level;
        const levelLabel = labels[level];
        return (
          <button
            key={level}
            onClick={(e) => handleClick(level, e)}
            className={`px-2 py-1 rounded text-xs font-medium transition-all duration-100 ${
              isActive
                ? level === 3
                  ? "bg-orange-500 text-white"
                  : level === 4
                    ? "bg-muted text-muted-foreground ring-1 ring-border"
                    : "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground/60 hover:bg-muted hover:text-muted-foreground"
            }`}
            title={`Priority: ${levelLabel}`}
          >
            {levelLabel}
          </button>
        );
      })}
    </div>
  );
}

// --- Summary helpers ---

function getSwellSummary(weights: ConditionWeights): string {
  const parts: string[] = [];
  if (weights.preferredWaveSize?.length) {
    const labels: Record<string, string> = { small: "Small", medium: "Med", large: "Large", xl: "XL" };
    parts.push(weights.preferredWaveSize.map(s => labels[s] || s).join(", "));
  }
  if (weights.preferredSwellPeriod?.length) {
    const labels: Record<string, string> = { short: "Short", medium: "Med", long: "Long" };
    parts.push(weights.preferredSwellPeriod.map(s => labels[s] || s).join(", "));
  }
  if (weights.swellExposure?.length) {
    parts.push(weights.swellExposure.join(", "));
  }
  return parts.length > 0 ? parts.join(" · ") : "No preference";
}

function getWindSummary(weights: ConditionWeights): string {
  const parts: string[] = [];
  if (weights.preferredWind?.length) {
    const labels: Record<string, string> = { glassy: "Glassy", offshore: "Offshore", "cross-offshore": "Cross-off", onshore: "Onshore" };
    parts.push(weights.preferredWind.map(s => labels[s] || s).join(", "));
  }
  if (weights.preferredWindDirections?.length) {
    parts.push(weights.preferredWindDirections.join(", "));
  }
  return parts.length > 0 ? parts.join(" · ") : "No preference";
}

function getTideSummary(weights: ConditionWeights): string {
  if (weights.preferredTide?.length) {
    const labels: Record<string, string> = { low: "Low", mid: "Mid", high: "High", incoming: "Incoming", outgoing: "Outgoing" };
    return weights.preferredTide.map(s => labels[s] || s).join(", ");
  }
  return "No preference";
}

// --- Compass pickers ---

const WIND_DIRECTIONS: { dir: CardinalDirection; row: number; col: number }[] = [
  { dir: "NW", row: 0, col: 0 },
  { dir: "N",  row: 0, col: 1 },
  { dir: "NE", row: 0, col: 2 },
  { dir: "W",  row: 1, col: 0 },
  { dir: "E",  row: 1, col: 2 },
  { dir: "SW", row: 2, col: 0 },
  { dir: "S",  row: 2, col: 1 },
  { dir: "SE", row: 2, col: 2 },
];

function WindDirectionPicker({
  value,
  onChange,
}: {
  value: CardinalDirection[];
  onChange: (directions: CardinalDirection[]) => void;
}) {
  function toggle(dir: CardinalDirection) {
    if (value.includes(dir)) {
      onChange(value.filter(d => d !== dir));
    } else {
      onChange([...value, dir]);
    }
  }

  return (
    <div className="grid grid-cols-3 gap-1.5 w-fit">
      {[0, 1, 2].map(row =>
        [0, 1, 2].map(col => {
          const entry = WIND_DIRECTIONS.find(d => d.row === row && d.col === col);
          if (!entry) {
            return (
              <div
                key={`${row}-${col}`}
                className="w-9 h-9 flex items-center justify-center"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
              </div>
            );
          }
          const selected = value.includes(entry.dir);
          return (
            <button
              key={entry.dir}
              type="button"
              onClick={() => toggle(entry.dir)}
              className={`w-9 h-9 rounded text-xs font-medium transition-all duration-100 ${
                selected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {entry.dir}
            </button>
          );
        })
      )}
    </div>
  );
}
