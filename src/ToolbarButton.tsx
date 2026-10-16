import {IconButton, SvgIcon, Tooltip} from '@mui/material'
import type {TableComponents, ToolbarButtonProps} from './types.js'

const icons = {
  search: <>
    <circle cx='10' cy='10' r='6' />
    <path d='m15 15 5 5' />
  </>,
  filters: <>
    <path d='M3 6h18M6 12h12M9 18h6' />
    <circle cx='8' cy='6' r='2' />
    <circle cx='16' cy='12' r='2' />
  </>,
  columns: <>
    <rect x='3' y='4' width='18' height='16' rx='1' />
    <path d='M9 4v16M15 4v16' />
  </>,
  csv: <>
    <path d='M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4' />
  </>,
  print: <>
    <path d='M6 9V3h12v6M6 18H3v-9h18v9h-3M6 14h12v7H6z' />
    <path d='M17 12h1' />
  </>
}

export function ToolbarButton({
  component: Component,
  ...props
}: Omit<ToolbarButtonProps, 'children'> & {component?: TableComponents['ToolbarButton']}) {
  const icon = <SvgIcon
    fontSize='small'
    sx={{fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round'}}>
    {icons[props.action]}
  </SvgIcon>
  return Component ? <Component {...props}>{icon}</Component> : <Tooltip title={props.label}>
    <IconButton
      size='small'
      aria-label={props.label}
      aria-pressed={props.active}
      aria-expanded={props.expanded}
      aria-haspopup={props.action === 'filters' || props.action === 'columns' ? 'dialog' : undefined}
      color={props.active ? 'primary' : 'default'}
      onClick={props.onClick}
      sx={{width: 36, height: 36}}>
      {icon}
    </IconButton>
  </Tooltip>
}
