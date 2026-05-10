export type ThemeId =
  | "default"
  | "dark"
  | "nebula"
  | "emerald"
  | "sunset"
  | "rose"
  | "arctic"
  | "pokemon"
  | "pacman"
  | "destiny"
  | "marathon";

export type Theme = {
  id: ThemeId;
  label: string;
  description: string;
  /** [page, primary, accent] used for the picker preview swatches */
  swatches: [string, string, string];
};

export const THEMES: readonly Theme[] = [
  {
    id: "default",
    label: "Default",
    description: "Clean & light",
    swatches: ["#f7f7f8", "#10101a", "#3b82f6"],
  },
  {
    id: "dark",
    label: "Dark",
    description: "Easy on the eyes",
    swatches: ["#0e0e14", "#f5f5fa", "#60a5fa"],
  },
  {
    id: "nebula",
    label: "Nebula",
    description: "Purple & blue mesh",
    swatches: ["#a855f7", "#3b82f6", "#60a5fa"],
  },
  {
    id: "emerald",
    label: "Emerald",
    description: "Teal & green mesh",
    swatches: ["#10b981", "#14b8a6", "#34d399"],
  },
  {
    id: "sunset",
    label: "Sunset",
    description: "Orange & amber mesh",
    swatches: ["#f97316", "#ef4444", "#fb923c"],
  },
  {
    id: "rose",
    label: "Rose",
    description: "Pink & violet mesh",
    swatches: ["#ec4899", "#a855f7", "#f472b6"],
  },
  {
    id: "arctic",
    label: "Arctic",
    description: "Sky & indigo mesh",
    swatches: ["#38bdf8", "#6366f1", "#38bdf8"],
  },
  {
    id: "pokemon",
    label: "Pokemon",
    description: "Pokeball red & cream",
    swatches: ["#fff8eb", "#ee1515", "#ffcb05"],
  },
  {
    id: "pacman",
    label: "Pac-Man",
    description: "Arcade waka waka",
    swatches: ["#000000", "#ffcc00", "#ff7eb9"],
  },
  {
    id: "destiny",
    label: "Destiny 2",
    description: "Void & solar",
    swatches: ["#0d0d1f", "#a050ff", "#ff8a00"],
  },
  {
    id: "marathon",
    label: "Marathon",
    description: "Terminal red & cyan",
    swatches: ["#000000", "#e54b4b", "#00d4ff"],
  },
] as const;

export const DEFAULT_THEME: ThemeId = "default";
export const THEME_STORAGE_KEY = "semestersync-theme";

export function isThemeId(value: string): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}
