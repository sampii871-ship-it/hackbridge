import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, Circle, UsersRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createTeam, getMyTeam, joinTeam } from '../api/teams';
import { getOnboarding, joinHackathon } from '../api/hackathons';
import { useHackathons } from '../context/HackathonContext';
import { ErrorState, LoadingState } from '../components/ui/AsyncState';
import { ApiError } from '../api/client';

export function Onboarding() {
  const { activeHackathon, loading: eventsLoading } = useHackathons();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');

  const progressQuery = useQuery({
    queryKey: ['onboarding', activeHackathon?.id],
    queryFn: () => getOnboarding(activeHackathon!.id),
    enabled: Boolean(activeHackathon),
  });
  const teamQuery = useQuery({
    queryKey: ['team', activeHackathon?.id],
    queryFn: () => getMyTeam(activeHackathon!.id),
    enabled: Boolean(activeHackathon),
    retry: (failureCount, error) => failureCount < 1 && !(error instanceof ApiError && error.status === 404),
  });

  const joinEvent = useMutation({
    mutationFn: () => joinHackathon(activeHackathon!.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['onboarding', activeHackathon?.id] });
      setError('');
    },
    onError: reason => setError(errorMessage(reason)),
  });
  const makeTeam = useMutation({
    mutationFn: () => createTeam(activeHackathon!.id, teamName, projectTitle || 'Untitled project'),
    onSuccess: team => {
      queryClient.setQueryData(['team', activeHackathon?.id], team);
      queryClient.invalidateQueries({ queryKey: ['onboarding', activeHackathon?.id] });
      navigate(`/project/${team.project_id}`);
    },
    onError: reason => setError(errorMessage(reason)),
  });
  const joinExisting = useMutation({
    mutationFn: () => joinTeam(inviteCode.trim()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['team', activeHackathon?.id] });
      await queryClient.invalidateQueries({ queryKey: ['onboarding', activeHackathon?.id] });
      setError('');
    },
    onError: reason => setError(errorMessage(reason)),
  });

  if (eventsLoading) return <LoadingState />;
  if (!activeHackathon) return <EmptyEvents />;
  if (progressQuery.isLoading) return <LoadingState label="Checking your onboarding status" />;
  if (progressQuery.isError) return <ErrorState message={errorMessage(progressQuery.error)} retry={() => progressQuery.refetch()} />;
  if (!progressQuery.data) return <LoadingState label="Waiting for onboarding status" />;

  const progress = progressQuery.data;
  const joined = !progress.blockers.includes('Join this hackathon');
  const alreadyOnTeam = !progress.blockers.includes('Create or join a team');
  const milestones = [
    { label: 'Account ready', detail: 'Your participant profile is set up.', complete: true },
    { label: 'Join the event', detail: activeHackathon.title, complete: joined },
    { label: 'Find your team', detail: 'Create a team or use an invite code.', complete: alreadyOnTeam },
    { label: 'Start building', detail: 'Your project workspace is created with your team.', complete: progress.blockers.includes('Add your project title, tagline, and description') === false },
  ];

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    makeTeam.mutate();
  }

  function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    joinExisting.mutate();
  }

  return (
    <div className="onboarding-page">
      <div className="page-heading"><div><div className="eyebrow">{activeHackathon.title} / Your path</div><h1>Every project starts somewhere.</h1><p>Get your place in the event, then build with your team.</p></div><div className="progress-pill">{progress.progress_percent}% complete</div></div>
      <div className="onboarding-layout">
        <section className="surface journey-panel">
          <div className="surface-heading"><div><h2>Your starting line</h2><p>Progress updates as the backend sees your work.</p></div><div className="journey-count">{milestones.filter(item => item.complete).length}/{milestones.length}</div></div>
          <div className="journey-list">{milestones.map((item, index) => (
            <div className={`journey-item ${item.complete ? 'journey-complete' : ''}`} key={item.label}>
              <span className="journey-marker">{item.complete ? <Check size={13} /> : <Circle size={14} />}</span>
              <div><strong>{item.label}</strong><span>{item.detail}</span></div>
              {!item.complete && <small>{String(index + 1).padStart(2, '0')}</small>}
            </div>
          ))}</div>
          <div className="backend-progress"><div><span>BACKEND ONBOARDING</span><strong>{progress.current_step.replaceAll('_', ' ')}</strong></div><div className="progress-track"><span style={{ width: `${progress.progress_percent}%` }} /></div></div>
        </section>
        <section className="surface setup-panel">
          <div className="setup-art"><UsersRound size={20} /><span>FIELDNOTES / 2026</span></div>
          {!joined ? (
            <><div className="eyebrow">Step 01</div><h2>Join the hackathon</h2><p>Get access to the event workspace and meet your next collaborators.</p><button className="button button-primary" disabled={joinEvent.isPending} onClick={() => joinEvent.mutate()}>{joinEvent.isPending ? 'Joining…' : `Join ${activeHackathon.title}`} <ArrowRight size={16} /></button></>
          ) : alreadyOnTeam ? (
            <><div className="eyebrow">Team ready</div><h2>{teamQuery.data?.name ?? 'Your team is waiting'}</h2><p>Your team workspace is connected to this hackathon.</p>{teamQuery.data && <Link className="button button-primary" to={`/project/${teamQuery.data.project_id}`}>Open project <ArrowRight size={16} /></Link>}</>
          ) : (
            <><div className="eyebrow">Step 02</div><h2>Bring people together.</h2><p>Start a team or join one with an invite code.</p>
              <form className="setup-form" onSubmit={create}><label>Team name<input value={teamName} onChange={event => setTeamName(event.target.value)} required maxLength={255} placeholder="e.g. Common Ground" /></label><label>Project name <span>(you can change it later)</span><input value={projectTitle} onChange={event => setProjectTitle(event.target.value)} maxLength={255} placeholder="An idea taking shape" /></label><button className="button button-primary" disabled={makeTeam.isPending}>{makeTeam.isPending ? 'Creating…' : 'Create team'} <ArrowRight size={16} /></button></form>
              <div className="form-divider"><span>OR JOIN WITH A CODE</span></div>
              <form className="invite-form" onSubmit={join}><input aria-label="Team invite code" value={inviteCode} onChange={event => setInviteCode(event.target.value)} required minLength={4} placeholder="ENTER CODE" /><button className="button button-secondary" disabled={joinExisting.isPending}>Join</button></form>
            </>
          )}
          {error && <div className="inline-error" role="alert">{error}</div>}
        </section>
      </div>
    </div>
  );
}

function EmptyEvents() {
  return <div className="empty-state surface"><span className="eyebrow">No active event</span><h1>The next build starts here.</h1><p>There aren’t any active hackathons to join yet.</p></div>;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}