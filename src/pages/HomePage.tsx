import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { generateInviteCode } from '../lib/constants'
import type { GroupWithRole } from '../lib/types'

export function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [groups, setGroups] = useState<GroupWithRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [creating, setCreating] = useState(false)

  const [showJoin, setShowJoin] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [joining, setJoining] = useState(false)

  async function loadGroups() {
    if (!user) return

    const { data: memberships, error: memberError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id)

    if (memberError) {
      setError(memberError.message)
      setLoading(false)
      return
    }

    const groupIds = memberships?.map((m) => m.group_id) ?? []

    if (groupIds.length === 0) {
      setGroups([])
      setLoading(false)
      return
    }

    const { data, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .in('id', groupIds)
      .order('created_at', { ascending: false })

    if (groupError) {
      setError(groupError.message)
    } else {
      setGroups(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadGroups()
  }, [user])

  async function handleCreateGroup(e: FormEvent) {
    e.preventDefault()
    if (!user || !groupName.trim()) return

    setCreating(true)
    setError(null)

    const code = generateInviteCode()
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: groupName.trim(),
        invite_code: code,
        created_by: user.id,
      })
      .select()
      .single()

    if (groupError || !group) {
      setError(groupError?.message ?? 'Failed to create group')
      setCreating(false)
      return
    }

    const { error: memberError } = await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: user.id,
    })

    if (memberError) {
      setError(memberError.message)
      setCreating(false)
      return
    }

    setShowCreate(false)
    setGroupName('')
    setCreating(false)
    navigate(`/group/${group.id}`)
  }

  async function handleJoinGroup(e: FormEvent) {
    e.preventDefault()
    if (!user || !inviteCode.trim()) return

    setJoining(true)
    setError(null)

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id')
      .eq('invite_code', inviteCode.trim().toUpperCase())
      .single()

    if (groupError || !group) {
      setError('Invalid invite code')
      setJoining(false)
      return
    }

    const { error: memberError } = await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: user.id,
    })

    if (memberError) {
      if (memberError.code === '23505') {
        setError('You are already in this group')
      } else {
        setError(memberError.message)
      }
      setJoining(false)
      return
    }

    setShowJoin(false)
    setInviteCode('')
    setJoining(false)
    navigate(`/group/${group.id}`)
  }

  return (
    <Layout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Your groups</h2>
        <p className="mt-1 text-sm text-slate-500">
          Create a group or join friends with an invite code.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Create group
        </button>
        <button
          type="button"
          onClick={() => setShowJoin(true)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Join with code
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-slate-500">Loading groups...</p>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-500">No groups yet. Create one to start dropping pins on Spotz.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {groups.map((group) => (
            <li key={group.id}>
              <Link
                to={`/group/${group.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{group.name}</h3>
                    <p className="text-xs text-slate-500">Code: {group.invite_code}</p>
                  </div>
                  <span className="text-slate-400">→</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">Create a group</h3>
            <form onSubmit={handleCreateGroup}>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Weekend crew, favorite spotz..."
                className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showJoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">Join a group</h3>
            <form onSubmit={handleJoinGroup}>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Enter invite code"
                className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase tracking-widest focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowJoin(false)}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joining}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {joining ? 'Joining...' : 'Join'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
