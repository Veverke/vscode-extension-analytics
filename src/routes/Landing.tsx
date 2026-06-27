import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'

const GITHUB_USERNAME_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/

/**
 * Landing / username input screen.
 *
 * Validates the GitHub username format and, on submit, stores the username
 * in context and navigates to the discovery results page.
 */
export default function Landing() {
  const navigate = useNavigate()
  const { setUsername } = useUser()
  const [inputValue, setInputValue] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = inputValue.trim()

    if (!trimmed) {
      setValidationError('Please enter a GitHub username.')
      return
    }

    if (!GITHUB_USERNAME_PATTERN.test(trimmed)) {
      setValidationError(
        'Invalid GitHub username format. Usernames are 1-39 characters containing only letters, numbers, and single hyphens.'
      )
      return
    }

    setValidationError(null)
    setUsername(trimmed)
    navigate(`/discover/${encodeURIComponent(trimmed)}`)
  }

  return (
    <div className="landing">
      <div className="landing__card">
        <div className="landing__icon">📊</div>
        <h1 className="landing__title">VS Code Extension Analytics</h1>
        <p className="landing__subtitle">
          Discover and track analytics for your VS Code extensions.
          <br />
          Enter your GitHub username to get started.
        </p>

        <form className="landing__form" onSubmit={handleSubmit} noValidate>
          <div className="landing__input-group">
            <label htmlFor="github-username" className="landing__label">
              GitHub Username
            </label>
            <input
              id="github-username"
              type="text"
              className={`landing__input${validationError ? ' landing__input--error' : ''}`}
              placeholder="e.g. Veverke"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value)
                if (validationError) setValidationError(null)
              }}
              autoFocus
              autoComplete="username"
              spellCheck={false}
              aria-describedby={validationError ? 'username-error' : undefined}
              aria-invalid={!!validationError}
            />
            {validationError && (
              <p id="username-error" className="landing__error" role="alert">
                {validationError}
              </p>
            )}
          </div>

          <button type="submit" className="landing__button">
            Discover My Extensions
          </button>
        </form>

        <p className="landing__hint">
          Your username is stored locally and is never sent to our servers.
        </p>
      </div>
    </div>
  )
}