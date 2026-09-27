import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Crown, Link2, Save, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getMyTeam, getTeamMembers, renameTeam } from '../api/teams';
import { useAuth } from '../context/AuthContext';
import { useHackathons } from '../context/HackathonContext';
import { ErrorState, LoadingState } from '../components/ui/AsyncState';
import { ApiError } from '../api/client';

export function TeamPage() {
  const { user } = useAuth();
  const { activeHackathon } = useHackathons();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const teamQuery = useQuery({
    queryKey: ['team', activeHackathon?.id],
    queryFn: () => getMyTeam(activeHackathon!.id),
    enabled: Boolean(activeHackathon),
    retry: (failureCount, error) => failureCount < 1 && !(error instanceof ApiError && error.status === 404),
  });
  const membersQuery = useQuery({
    queryKey: ['team-members', teamQuery.data?.id],
    queryFn: () => getTeamMembers(teamQuery.data!.id),
    enabled: Boolean(teamQuery.data),
  });
  const updateMutation = useMutation({
    mutationFn: () => renameTeam(teamQuery.data!.id, name),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['team', activeHackathon?.id] });
      setError('');
    },
    onError: reason => setError(message(reason)),
  });

  if (!activeHackathon) return <div className="empty-state surface"><h1>No event selected.</h1><p>Choose an event to find your team.</p></div>;
  if (teamQuery.isLoading) return <LoadingState label="Loading team" />;
  if (teamQuery.isError) {
    if (teamQuery.error instanceof ApiError && teamQuery.error.status === 404) {
      return <div className="empty-state surface"><span className="eyebrow">{activeHackathon.title}</span><h1>Your team starts with you.</h1><p>Join this hackathon and create a team workspace.</p><Link className="button button-primary" to="/onboarding">Go to onboarding</Link></div>;
    }
    return <ErrorState message={message(teamQuery.error)} retry={() => teamQuery.refetch()} />;
  }
  if (!teamQuery.data) return null;

  const team = teamQuery.data;
  const isLeader = user?.id === team.leader_id;
  const sortedMembers = [...(membersQuery.data ?? [])].sort((a, b) => a.id === team.leader_id ? -1 : b.id === team.leader_id ? 1 : a.full_name.localeCompare(b.full_name));

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(team.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Clipboard access is unavailable in this browser.');
    }
  }

  function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    updateMutation.mutate();
  }

  return (
    <>
      <div className="page-heading"><div><div className="eyebrow">Workspace / Team</div><h1>Your people.</h1><p>A shared space for the builders behind the idea.</p></div><span className="member-count"><UsersRound size={15} /> {sortedMembers.length} member{sortedMembers.length === 1 ? '' : 's'}</span></div>
      <div className="team-page-grid">
        <section className="surface team-roster">
          <div className="section-heading"><div><h2>Team roster</h2><p>{team.name} · {activeHackathon.title}</p></div><span className="status-tag"><i />ACTIVE TEAM</span></div>
          {membersQuery.isLoading ? <LoadingState label="Loading team members" /> : membersQuery.isError ? <ErrorState message={message(membersQuery.error)} retry={() => membersQuery.refetch()} /> : (
            <div className="roster-list">{sortedMembers.map((member, index) => (
              <div className="roster-member" key={member.id}>
                <span className={`avatar roster-avatar avatar-tone-${index % 4}`}>{initials(member.full_name)}</span>
                <span className="roster-person"><strong>{member.full_name}</strong><small>{member.email}</small></span>
                <span className="member-role">{member.id === team.leader_id ? <><Crown size={13} /> Team leader</> : 'Member'}</span>
              </div>
            ))}</div>
          )}
          {isLeader && <form className="team-name-form" onSubmit={saveName}><label htmlFor="teamName">Team profile</label><div><input id="teamName" value={name || team.name} onChange={event => setName(event.target.value)} maxLength={255} /><button className="button button-secondary" disabled={updateMutation.isPending}><Save size={15} /> Save</button></div></form>}
          {error && <div className="inline-error" role="alert">{error}</div>}
        </section>
        <aside className="team-side-column">
          <section className="surface invite-panel"><span className="invite-icon"><Link2 size={18} /></span><div className="eyebrow">GROW THE TEAM</div><h2>Invite a collaborator.</h2><p>Share the team code with a participant in this hackathon.</p><div className="invite-code"><code>{team.invite_code}</code><button className="icon-button" onClick={copyInvite} aria-label="Copy invite code" title="Copy invite code">{copied ? <Check size={16} /> : <Copy size={16} />}</button></div>{copied && <span className="copied-note">Invite code copied</span>}</section>
          <section className="surface team-project-panel"><div className="eyebrow">SHARED WORKSPACE</div><h2>{team.name}</h2><p>Project details, task board, milestones, and submission live together.</p><Link className="text-link" to={`/project/${team.project_id}`}>Open project <span>↗</span></Link></section>
        </aside>
      </div>
    </>
  );
}

function initials(name: string) {
  return name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
}

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to load this information.';
}