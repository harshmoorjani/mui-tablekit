import { createTheme } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material';

export const themes = [
  { id: 'canvas', label: 'Canvas · light', mode: 'light', primary: '#175cd3', background: '#f5f7fa', paper: '#ffffff' },
  { id: 'garden', label: 'Garden · light', mode: 'light', primary: '#286444', background: '#f1f5ef', paper: '#ffffff' },
  { id: 'midnight', label: 'Midnight · dark', mode: 'dark', primary: '#93c5fd', background: '#0e1726', paper: '#182437' },
  { id: 'plum', label: 'Plum · dark', mode: 'dark', primary: '#dfb4ff', background: '#1b1523', paper: '#2a2035' },
] as const;

export function demoTheme(id: string) {
  const preset = themes.find(theme => theme.id === id) ?? themes[0];
  return createTheme({
    palette: { mode: preset.mode as PaletteMode, contrastThreshold: 4.5,
      primary: { main: preset.primary }, background: { default: preset.background, paper: preset.paper } },
    typography: { fontFamily: 'system-ui, sans-serif', button: { textTransform: 'none' } },
    shape: { borderRadius: 8 },
  });
}
