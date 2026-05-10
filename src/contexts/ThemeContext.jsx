import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'semestersync_theme';

export const THEMES = {
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    emoji: '🌙',
    colors: {
      '--bg-primary': '#0a0e1a',
      '--bg-secondary': '#111827',
      '--bg-tertiary': '#1a2235',
      '--bg-elevated': '#1e293b',
      '--bg-surface': 'rgba(30, 41, 59, 0.6)',
      '--gradient-primary': 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)',
      '--gradient-accent': 'linear-gradient(135deg, #3b82f6, #6366f1, #8b5cf6)',
      '--gradient-warm': 'linear-gradient(135deg, #f472b6, #a855f7, #6366f1)',
      '--gradient-bg': 'linear-gradient(145deg, #0a0e1a 0%, #111827 50%, #0f172a 100%)',
      '--text-primary': '#f1f5f9',
      '--text-secondary': '#94a3b8',
      '--text-tertiary': '#64748b',
      '--text-accent': '#a78bfa',
      '--border-subtle': 'rgba(148, 163, 184, 0.08)',
      '--border-default': 'rgba(148, 163, 184, 0.15)',
      '--border-hover': 'rgba(139, 92, 246, 0.3)',
      '--glass-bg': 'rgba(30, 41, 59, 0.4)',
      '--glass-bg-hover': 'rgba(30, 41, 59, 0.6)',
      '--glass-border': 'rgba(148, 163, 184, 0.1)',
      '--shadow-glow': '0 0 40px rgba(139, 92, 246, 0.15)',
      '--bg-glow-1': '#8b5cf6',
      '--bg-glow-2': '#3b82f6',
    },
  },
  light: {
    id: 'light',
    name: 'Light',
    emoji: '☀️',
    colors: {
      '--bg-primary': '#ffffff',
      '--bg-secondary': '#f8fafc',
      '--bg-tertiary': '#f1f5f9',
      '--bg-elevated': '#e2e8f0',
      '--bg-surface': 'rgba(241, 245, 249, 0.8)',
      '--gradient-primary': 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)',
      '--gradient-accent': 'linear-gradient(135deg, #3b82f6, #6366f1, #8b5cf6)',
      '--gradient-warm': 'linear-gradient(135deg, #ec4899, #a855f7, #6366f1)',
      '--gradient-bg': 'linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
      '--text-primary': '#0f172a',
      '--text-secondary': '#475569',
      '--text-tertiary': '#94a3b8',
      '--text-accent': '#7c3aed',
      '--border-subtle': 'rgba(15, 23, 42, 0.06)',
      '--border-default': 'rgba(15, 23, 42, 0.12)',
      '--border-hover': 'rgba(139, 92, 246, 0.3)',
      '--glass-bg': 'rgba(255, 255, 255, 0.7)',
      '--glass-bg-hover': 'rgba(255, 255, 255, 0.85)',
      '--glass-border': 'rgba(15, 23, 42, 0.08)',
      '--shadow-glow': '0 0 40px rgba(139, 92, 246, 0.1)',
      '--bg-glow-1': '#c4b5fd',
      '--bg-glow-2': '#93c5fd',
    },
  },
  dracula: {
    id: 'dracula',
    name: 'Dracula',
    emoji: '🧛',
    colors: {
      '--bg-primary': '#282a36',
      '--bg-secondary': '#21222c',
      '--bg-tertiary': '#2d2f3d',
      '--bg-elevated': '#343746',
      '--bg-surface': 'rgba(52, 55, 70, 0.6)',
      '--gradient-primary': 'linear-gradient(135deg, #bd93f9, #ff79c6)',
      '--gradient-accent': 'linear-gradient(135deg, #8be9fd, #bd93f9)',
      '--gradient-warm': 'linear-gradient(135deg, #ff79c6, #bd93f9, #8be9fd)',
      '--gradient-bg': 'linear-gradient(145deg, #282a36 0%, #21222c 50%, #1e1f29 100%)',
      '--text-primary': '#f8f8f2',
      '--text-secondary': '#bfbfbf',
      '--text-tertiary': '#6272a4',
      '--text-accent': '#bd93f9',
      '--border-subtle': 'rgba(98, 114, 164, 0.15)',
      '--border-default': 'rgba(98, 114, 164, 0.25)',
      '--border-hover': 'rgba(189, 147, 249, 0.4)',
      '--glass-bg': 'rgba(40, 42, 54, 0.5)',
      '--glass-bg-hover': 'rgba(40, 42, 54, 0.7)',
      '--glass-border': 'rgba(98, 114, 164, 0.15)',
      '--shadow-glow': '0 0 40px rgba(189, 147, 249, 0.15)',
      '--bg-glow-1': '#bd93f9',
      '--bg-glow-2': '#ff79c6',
    },
  },
  nord: {
    id: 'nord',
    name: 'Nord',
    emoji: '❄️',
    colors: {
      '--bg-primary': '#2e3440',
      '--bg-secondary': '#3b4252',
      '--bg-tertiary': '#434c5e',
      '--bg-elevated': '#4c566a',
      '--bg-surface': 'rgba(59, 66, 82, 0.6)',
      '--gradient-primary': 'linear-gradient(135deg, #88c0d0, #81a1c1, #5e81ac)',
      '--gradient-accent': 'linear-gradient(135deg, #8fbcbb, #88c0d0, #81a1c1)',
      '--gradient-warm': 'linear-gradient(135deg, #bf616a, #d08770, #ebcb8b)',
      '--gradient-bg': 'linear-gradient(145deg, #2e3440 0%, #3b4252 50%, #2e3440 100%)',
      '--text-primary': '#eceff4',
      '--text-secondary': '#d8dee9',
      '--text-tertiary': '#81a1c1',
      '--text-accent': '#88c0d0',
      '--border-subtle': 'rgba(216, 222, 233, 0.06)',
      '--border-default': 'rgba(216, 222, 233, 0.12)',
      '--border-hover': 'rgba(136, 192, 208, 0.3)',
      '--glass-bg': 'rgba(46, 52, 64, 0.5)',
      '--glass-bg-hover': 'rgba(46, 52, 64, 0.7)',
      '--glass-border': 'rgba(216, 222, 233, 0.08)',
      '--shadow-glow': '0 0 40px rgba(136, 192, 208, 0.12)',
      '--bg-glow-1': '#88c0d0',
      '--bg-glow-2': '#5e81ac',
    },
  },
  rosePine: {
    id: 'rosePine',
    name: 'Rosé Pine',
    emoji: '🌹',
    colors: {
      '--bg-primary': '#191724',
      '--bg-secondary': '#1f1d2e',
      '--bg-tertiary': '#26233a',
      '--bg-elevated': '#2a2740',
      '--bg-surface': 'rgba(38, 35, 58, 0.6)',
      '--gradient-primary': 'linear-gradient(135deg, #c4a7e7, #ebbcba)',
      '--gradient-accent': 'linear-gradient(135deg, #9ccfd8, #c4a7e7)',
      '--gradient-warm': 'linear-gradient(135deg, #ebbcba, #eb6f92, #c4a7e7)',
      '--gradient-bg': 'linear-gradient(145deg, #191724 0%, #1f1d2e 50%, #191724 100%)',
      '--text-primary': '#e0def4',
      '--text-secondary': '#908caa',
      '--text-tertiary': '#6e6a86',
      '--text-accent': '#c4a7e7',
      '--border-subtle': 'rgba(224, 222, 244, 0.06)',
      '--border-default': 'rgba(224, 222, 244, 0.12)',
      '--border-hover': 'rgba(196, 167, 231, 0.3)',
      '--glass-bg': 'rgba(25, 23, 36, 0.5)',
      '--glass-bg-hover': 'rgba(25, 23, 36, 0.7)',
      '--glass-border': 'rgba(224, 222, 244, 0.08)',
      '--shadow-glow': '0 0 40px rgba(196, 167, 231, 0.12)',
      '--bg-glow-1': '#c4a7e7',
      '--bg-glow-2': '#9ccfd8',
    },
  },
  catppuccin: {
    id: 'catppuccin',
    name: 'Catppuccin',
    emoji: '🐱',
    colors: {
      '--bg-primary': '#1e1e2e',
      '--bg-secondary': '#181825',
      '--bg-tertiary': '#313244',
      '--bg-elevated': '#45475a',
      '--bg-surface': 'rgba(49, 50, 68, 0.6)',
      '--gradient-primary': 'linear-gradient(135deg, #cba6f7, #f5c2e7, #f38ba8)',
      '--gradient-accent': 'linear-gradient(135deg, #89dceb, #74c7ec, #cba6f7)',
      '--gradient-warm': 'linear-gradient(135deg, #f38ba8, #eba0ac, #f5c2e7)',
      '--gradient-bg': 'linear-gradient(145deg, #1e1e2e 0%, #181825 50%, #1e1e2e 100%)',
      '--text-primary': '#cdd6f4',
      '--text-secondary': '#a6adc8',
      '--text-tertiary': '#6c7086',
      '--text-accent': '#cba6f7',
      '--border-subtle': 'rgba(205, 214, 244, 0.06)',
      '--border-default': 'rgba(205, 214, 244, 0.12)',
      '--border-hover': 'rgba(203, 166, 247, 0.3)',
      '--glass-bg': 'rgba(30, 30, 46, 0.5)',
      '--glass-bg-hover': 'rgba(30, 30, 46, 0.7)',
      '--glass-border': 'rgba(205, 214, 244, 0.08)',
      '--shadow-glow': '0 0 40px rgba(203, 166, 247, 0.12)',
      '--bg-glow-1': '#cba6f7',
      '--bg-glow-2': '#89dceb',
    },
  },
};

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'midnight';
    } catch {
      return 'midnight';
    }
  });

  const applyTheme = useCallback((id) => {
    const theme = THEMES[id];
    if (!theme) return;

    const root = document.documentElement;
    
    // Inject legacy variables for existing specific classes
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Dynamically map legacy theme hex variables to the new ShadCN variables
    const shadcnMap = {
      '--background': theme.colors['--bg-primary'],
      '--foreground': theme.colors['--text-primary'],
      '--card': theme.colors['--bg-secondary'],
      '--card-foreground': theme.colors['--text-primary'],
      '--popover': theme.colors['--bg-secondary'],
      '--popover-foreground': theme.colors['--text-primary'],
      '--primary': theme.colors['--bg-glow-1'] || theme.colors['--text-accent'],
      '--primary-foreground': id === 'light' ? '#ffffff' : '#000000',
      '--secondary': theme.colors['--bg-elevated'],
      '--secondary-foreground': theme.colors['--text-primary'],
      '--muted': theme.colors['--bg-elevated'],
      '--muted-foreground': theme.colors['--text-secondary'],
      '--accent': theme.colors['--bg-surface'] || theme.colors['--bg-elevated'],
      '--accent-foreground': theme.colors['--text-accent'],
      '--destructive': '#ef4444',
      '--destructive-foreground': '#ffffff',
      '--border': theme.colors['--border-default'] || theme.colors['--bg-elevated'],
      '--input': theme.colors['--bg-elevated'],
      '--ring': theme.colors['--bg-glow-1'] || theme.colors['--text-accent'],
    };

    Object.entries(shadcnMap).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Toggle dark mode class if needed by third-party tools
    if (id === 'light') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }

    // Update glow colors explicitly
    const glow1 = document.querySelector('.bg-glow--purple');
    const glow2 = document.querySelector('.bg-glow--blue');
    if (glow1) glow1.style.background = theme.colors['--bg-glow-1'];
    if (glow2) glow2.style.background = theme.colors['--bg-glow-2'];
  }, []);

  useEffect(() => {
    applyTheme(themeId);
    localStorage.setItem(STORAGE_KEY, themeId);
  }, [themeId, applyTheme]);

  const setTheme = useCallback((id) => {
    if (THEMES[id]) setThemeId(id);
  }, []);

  return (
    <ThemeContext.Provider value={{ themeId, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
