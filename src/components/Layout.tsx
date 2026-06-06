import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
  title?: string
  backTo?: string
  actions?: ReactNode
}

export function Layout({ children, title, backTo, actions }: LayoutProps) {
  const { profile, signOut } = useAuth()

  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {backTo ? (
              <Link to={backTo} className="text-sm text-slate-500 hover:text-slate-800">
                ← Back
              </Link>
            ) : (
              <Link to="/" className="text-lg font-bold text-slate-900">
                Spotz
              </Link>
            )}
            {title && <h1 className="truncate text-lg font-semibold text-slate-900">{title}</h1>}
          </div>
          <div className="flex items-center gap-3">
            {actions}
            {profile && (
              <span className="hidden text-sm text-slate-500 sm:inline">
                @{profile.username}
              </span>
            )}
            <button
              type="button"
              onClick={() => signOut()}
              className="text-sm text-slate-500 hover:text-slate-800"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 p-4">{children}</main>
    </div>
  )
}
