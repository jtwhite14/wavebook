export function getScoreColor(score: number): string {
  if (score < 50) return "var(--heatmap-empty)";
  if (score < 60) return "var(--heatmap-1)";
  if (score < 70) return "var(--heatmap-2)";
  if (score < 80) return "var(--heatmap-3)";
  if (score < 90) return "var(--heatmap-4)";
  return "var(--heatmap-5)";
}

export function getScoreLabel(score: number): string {
  if (score <= 0) return "No data";
  if (score < 50) return "Very different";
  if (score < 65) return "Somewhat similar";
  if (score < 78) return "Similar";
  if (score < 88) return "Very similar";
  return "Near identical";
}

export const HEATMAP_CSS = `
  :root {
    --heatmap-empty: oklch(0.25 0 0);
    --heatmap-1: oklch(0.35 0.06 145);
    --heatmap-2: oklch(0.44 0.10 145);
    --heatmap-3: oklch(0.53 0.14 145);
    --heatmap-4: oklch(0.62 0.18 145);
    --heatmap-5: oklch(0.72 0.22 145);
  }
  @media (prefers-color-scheme: light) {
    :root {
      --heatmap-empty: oklch(0.92 0 0);
      --heatmap-1: oklch(0.85 0.04 145);
      --heatmap-2: oklch(0.75 0.08 145);
      --heatmap-3: oklch(0.65 0.12 145);
      --heatmap-4: oklch(0.55 0.16 145);
      --heatmap-5: oklch(0.45 0.20 145);
    }
  }
`;

export const HEATMAP_LEGEND_COLORS = [
  "var(--heatmap-empty)",
  "var(--heatmap-1)",
  "var(--heatmap-2)",
  "var(--heatmap-3)",
  "var(--heatmap-4)",
  "var(--heatmap-5)",
];
