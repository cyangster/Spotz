import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/constants'
import type { Group, GroupMember } from '../lib/types'

export function GroupMembersPage() {
  const { id: groupId } = useParams<{ id: string }>()
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!groupId) return

    async function load() {
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single()

      if (groupError) {
        setError(groupError.message)
        setLoading(false)
        return
      }

      setGroup(groupData)

      const { data: memberData, error: memberError } = await supabase
        .from('group_members')
        .select('*, profile:profiles(id, display_name, email)')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true })

      if (memberError) {
        setError(memberError.message)
      } else {
        setMembers((memberData as GroupMember[]) ?? [])
      }
      setLoading(false)
    }

    load()
  }, [groupId])

  return (
    <Layout title={group?.name ?? 'Members'} backTo={groupId ? `/group/${groupId}` : '/'}>
      {loading ? (
        <p className="text-slate-500">Loading members...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <>
          {group && (
            <p className="mb-4 text-sm text-slate-500">
              Invite code: <span className="font-mono font-semibold text-slate-800">{group.invite_code}</span>
            </p>
          )}
          <ul className="space-y-3">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {member.profile?.display_name ?? 'Unknown'}
                  </p>
                  <p className="text-xs text-slate-500">{member.profile?.email}</p>
                </div>
                <span className="text-xs text-slate-400">
                  Joined {formatDate(member.joined_at)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Layout>
  )
}
