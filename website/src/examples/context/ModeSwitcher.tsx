import {
  MODE,
  useModeValue,
  useSetMode,
} from './context'

export default function ModeSwitcher() {
  const mode = useModeValue()
  const handleModeChange = useSetMode()
  const next = mode === 'light' ? 'dark' : 'light'

  return (
    <button
      onClick={() => handleModeChange(next)}
      style={MODE[mode]}
    >
      Change to {next}
    </button>
  )
}
