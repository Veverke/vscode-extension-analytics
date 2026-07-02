import { useState, useRef, useEffect } from 'react'

interface Props {
  label: string          // "Velocity"
  formula: string        // "Δinstalls / Δtime"
  description: string    // "How fast installs are growing per hour"
  children: React.ReactNode   // The value being displayed
}

export default function FormulaTooltip({ label, formula, description, children }: Props) {
  const [visible, setVisible] = useState(false)
  const wrapperRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setVisible(false)
      }
    }
    if (visible) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [visible])

  return (
    <span className="formula-tooltip-wrapper" ref={wrapperRef}>
      {children}
      <span
        className="formula-tooltip-icon"
        role="button"
        tabIndex={0}
        aria-label={`Info about ${label}`}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        onClick={() => setVisible((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setVisible((v) => !v)
          }
        }}
      >
        ⓘ
      </span>
      {visible && (
        <div className="formula-tooltip-popover" role="tooltip">
          <div className="formula-tooltip-label">{label}</div>
          <div className="formula-tooltip-formula">{formula}</div>
          <div className="formula-tooltip-desc">{description}</div>
        </div>
      )}
    </span>
  )
}