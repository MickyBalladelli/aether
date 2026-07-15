import TuneIcon from '@mui/icons-material/Tune'
import { Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import type { AnimationQuality } from '../types/weather'

type AnimationQualityControlProps = {
  quality: AnimationQuality
  onChange: (quality: AnimationQuality) => void
}

const QUALITY_OPTIONS: Array<{
  value: AnimationQuality
  label: string
}> = [
  { value: 'low', label: 'Low' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'high', label: 'High' }
]

export function AnimationQualityControl({
  quality,
  onChange
}: AnimationQualityControlProps) {
  return (
    <Box className="animation-quality-control">
      <Box className="animation-quality-heading">
        <TuneIcon />
        <Typography variant="caption">Animation quality</Typography>
      </Box>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={quality}
        aria-label="Animation quality"
        onChange={(_, value: AnimationQuality | null) => {
          if (value) {
            onChange(value)
          }
        }}
      >
        {QUALITY_OPTIONS.map(option => (
          <ToggleButton
            key={option.value}
            value={option.value}
            aria-label={`${option.label} animation quality`}
          >
            {option.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  )
}
