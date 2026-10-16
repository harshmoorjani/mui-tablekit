import { useEffect, useId, useRef, useState } from 'react';
import { InputAdornment, SvgIcon, TextField } from '@mui/material';
import type { ReactNode } from 'react';
import type { SearchControlProps } from './types.js';

export function SearchField({ value, label, delay = 0, onChange, render, autoFocus }: {
  value: string; label: string; delay?: number; onChange: (value: string) => void;
  render?: (props: SearchControlProps) => ReactNode;
  autoFocus?: boolean;
}) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [pending, setPending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const commit = useRef(onChange); commit.current = onChange;
  useEffect(() => { clearTimeout(timer.current); setDraft(value); setPending(false); }, [value]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const change = (next: string) => {
    setDraft(next); clearTimeout(timer.current);
    if (delay > 0) { setPending(true); timer.current = setTimeout(() => { commit.current(next); setPending(false); }, delay); }
    else commit.current(next);
  };
  const text = pending ? draft : value;
  return render ? render({ id, label, value: text, onChange: change, autoFocus })
    : <TextField id={id} placeholder={label} size="small" type="search" value={text} autoFocus={autoFocus} onChange={event => change(event.target.value)}
      sx={{ width: { xs: 140, sm: 240 }, '& .MuiInputBase-root': { height: 36, fontSize: '0.875rem' } }}
      slotProps={{ htmlInput: { 'aria-label': label }, input: { startAdornment: <InputAdornment position="start"><SvgIcon fontSize="small" sx={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.7 }}><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></SvgIcon></InputAdornment> } }} />;
}
