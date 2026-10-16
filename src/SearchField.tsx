import { useEffect, useId, useRef, useState } from 'react';
import { TextField } from '@mui/material';
import type { ReactNode } from 'react';
import type { SearchControlProps } from './types.js';

export function SearchField({ value, label, delay = 0, onChange, render }: {
  value: string; label: string; delay?: number; onChange: (value: string) => void;
  render?: (props: SearchControlProps) => ReactNode;
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
  return render ? render({ id, label, value: text, onChange: change })
    : <TextField id={id} label={label} size="small" type="search" value={text} onChange={event => change(event.target.value)} />;
}
