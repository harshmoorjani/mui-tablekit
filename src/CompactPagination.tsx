import {useId} from 'react'
import {Box, Divider, IconButton, Stack, SvgIcon, TextField, Tooltip} from '@mui/material'
import {useThemeProps} from '@mui/material/styles'
import type {TablePaginationProps} from '@mui/material/TablePagination'

export function CompactPagination(
  inProps: TablePaginationProps & {pageLabel?: string; jumpToPage?: boolean; jumpLabel?: string}
) {
  const {
    count,
    page,
    rowsPerPage,
    rowsPerPageOptions = [],
    labelRowsPerPage,
    labelDisplayedRows,
    getItemAriaLabel,
    onPageChange,
    onRowsPerPageChange,
    showFirstButton,
    showLastButton,
    disabled,
    pageLabel = 'Page:',
    jumpToPage,
    jumpLabel
  } = useThemeProps({props: inProps, name: 'MuiTablePagination'})
  const sizeId = useId()
  const pageId = useId()
  const pages = Math.max(1, Math.ceil(count / rowsPerPage))
  const button = (type: 'first' | 'previous' | 'next' | 'last', target: number, path: string) => {
    const label = getItemAriaLabel?.(type) ?? type
    return <Tooltip title={label}>
      <span>
        <IconButton
          size='small'
          aria-label={label}
          sx={{width: 28, height: 28}}
          disabled={disabled || target === page || target < 0 || target >= pages}
          onClick={event => onPageChange(event, target)}>
          <SvgIcon fontSize='small'>
            <path d={path} />
          </SvgIcon>
        </IconButton>
      </span>
    </Tooltip>
  }
  const selectProps = {native: true, disableUnderline: true}
  const selectSx = {
    'minWidth': 40,
    '& .MuiInputBase-root': {height: 28, fontSize: {xs: '0.75rem', sm: '0.8125rem'}, lineHeight: '28px'},
    '& .MuiNativeSelect-select': {
      height: '28px',
      minHeight: '0 !important',
      boxSizing: 'border-box',
      py: 0,
      pl: 0.5,
      pr: 2.5,
      lineHeight: '28px'
    },
    '& .MuiNativeSelect-icon': {fontSize: 18, right: 0, top: 'calc(50% - 9px)'}
  }
  return <Stack
    direction='row'
    useFlexGap
    sx={{
      'px': {xs: 1, sm: 2},
      'py': 1,
      'gap': 0.5,
      'alignItems': 'center',
      'justifyContent': 'flex-end',
      'flexWrap': 'wrap',
      'fontSize': {xs: '0.75rem', sm: '0.8125rem'},
      'lineHeight': '28px',
      '& label': {lineHeight: '28px', whiteSpace: 'nowrap'},
      'color': 'text.secondary',
      'colorScheme': theme => theme.palette.mode
    }}>
    <Stack direction='row' sx={{gap: 0.5, alignItems: 'center'}}>
      <label htmlFor={sizeId}>{labelRowsPerPage}</label>
      <TextField
        id={sizeId}
        select
        variant='standard'
        size='small'
        value={rowsPerPage}
        disabled={disabled}
        onChange={onRowsPerPageChange}
        slotProps={{select: selectProps}}
        sx={selectSx}>
        {rowsPerPageOptions.map(option => <option
          key={typeof option === 'number' ? option : option.value}
          value={typeof option === 'number' ? option : option.value}>
          {typeof option === 'number' ? option : option.label}
        </option>)}
      </TextField>
    </Stack>
    <Divider orientation='vertical' flexItem sx={{'mx': 0.5, '@media (max-width: 359px)': {display: 'none'}}} />
    <Stack direction='row' sx={{gap: 0.25, alignItems: 'center'}}>
      <label htmlFor={pageId}>{pageLabel}</label>
      {showFirstButton && button('first', 0, 'M6 6h2v12H6zm12 0-6 6 6 6z')}
      {button('previous', page - 1, 'm15 6-6 6 6 6 1.4-1.4-4.6-4.6 4.6-4.6z')}
      {pages <= 200 && !jumpToPage ? <TextField
        id={pageId}
        select
        variant='standard'
        size='small'
        value={page}
        disabled={disabled}
        onChange={event => onPageChange(null, Number(event.target.value))}
        slotProps={{select: selectProps}}
        sx={selectSx}>
        {Array.from({length: pages}, (_, index) => <option key={index} value={index}>
          {index + 1}
        </option>)}
      </TextField> : <TextField
        id={pageId}
        key={page}
        type='number'
        variant='standard'
        size='small'
        defaultValue={page + 1}
        disabled={disabled}
        sx={{...selectSx, width: 72}}
        slotProps={{htmlInput: {'min': 1, 'max': pages, 'step': 1, 'aria-label': jumpToPage ? jumpLabel : undefined}}}
        onKeyDown={event => {
          if (event.key === 'Enter') (event.target as HTMLInputElement).blur()
        }}
        onBlur={event => {
          const value = Number(event.target.value)
          event.target.value = String(page + 1)
          if (Number.isInteger(value) && value >= 1 && value <= pages) onPageChange(null, value - 1)
        }}
      />}
      <Box component='span'>/ {pages}</Box>
      {button('next', page + 1, 'm9 6 6 6-6 6-1.4-1.4 4.6-4.6-4.6-4.6z')}
      {showLastButton && button('last', pages - 1, 'M16 6h2v12h-2zM6 6l6 6-6 6z')}
    </Stack>
    <Box
      component='span'
      aria-live='polite'
      sx={{
        position: 'absolute',
        width: 1,
        height: 1,
        overflow: 'hidden',
        clipPath: 'inset(50%)',
        whiteSpace: 'nowrap'
      }}>
      {labelDisplayedRows?.({
        from: count ? page * rowsPerPage + 1 : 0,
        to: Math.min(count, (page + 1) * rowsPerPage),
        count,
        page
      })}
    </Box>
  </Stack>
}
