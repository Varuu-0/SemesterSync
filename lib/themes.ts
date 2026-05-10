export type ThemeId =
  | "default"
  | "dark"
  | "pokemon"
  | "pacman"
  | "destiny"
  | "marathon"
  | "fortnite";

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
  {
    id: "fortnite",
    label: "Fortnite",
    description: "Battle bus neon",
    swatches: ["#1d0e3e", "#3afaff", "#fdf300"],
  },
] as const;

export const DEFAULT_THEME: ThemeId = "default";
export const THEME_STORAGE_KEY = "semestersync-theme";

export function isThemeId(value: string): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}
