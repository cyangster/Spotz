import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isValidUsername, normalizeUsername } from '../lib/constants'
import { isSupabaseConfigured } from '../lib/supabase'

export function LoginPage() {
  const { session, signIn, signUp } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (session) {
    return <Navigate to={from} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (isSignUp) {
      if (!displayName.trim()) {
        setError('Display name is required')
        setLoading(false)
        return
      }
      const normalizedUsername = normalizeUsername(username)
      if (!isValidUsername(normalizedUsername)) {
        setError('Username must be 3–20 characters (letters, numbers, underscore)')
        setLoading(false)
        return
      }
      const result = await signUp(email, password, displayName.trim(), normalizedUsername)
      if (result.error) {
        setError(result.error)
      }
    } else {
      const result = await signIn(email, password)
      if (result.error) {
        setError(result.error)
      }
    }

    setLoading(false)
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Spotz</h1>
          <p className="mt-1 text-sm text-slate-500">Shared pin maps for your crew</p>
        </div>

        {!isSupabaseConfigured && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Supabase URL looks wrong. Use your API URL from Project Settings → API, e.g.{' '}
            <code className="text-xs">https://abc123.supabase.co</code> — not the dashboard link.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Display name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Username</label>
                <div className="flex rounded-lg border border-slate-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                  <span className="flex items-center pl-3 text-sm text-slate-400">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(normalizeUsername(e.target.value))}
                    className="w-full rounded-r-lg px-2 py-2 text-sm focus:outline-none"
                    placeholder="chris"
                    required
                    minLength={3}
                    maxLength={20}
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
              minLength={6}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError(null)
            }}
            className="font-medium text-blue-600 hover:text-blue-700"
          >
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  )
}
