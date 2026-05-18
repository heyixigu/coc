import './Screens.css'

/**
 * @param {{ onBack: () => void, label?: string }} props
 */
export default function ScreenBackButton({ onBack, label = '返回' }) {
  return (
    <button type="button" className="screen-back-btn" onClick={onBack} aria-label={label}>
      ← {label}
    </button>
  )
}
