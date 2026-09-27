import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, ArrowUpRight, Check, CircleAlert, Clock3, Layers3, ListTodo, UsersRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getOnboarding } from '../api/hackathons';
import { getMyTeam, getTeamMembers } from '../api/teams';
import { getMilestones, getProgress, getProject, getTasks, updateTask } from '../api/projects';
import { ApiError } from '../api/client';
import { TaskBoard } from '../components/dashboard/TaskBoard';
import { ErrorState, LoadingState } from '../components/ui/AsyncState';
import { useAuth } from '../context/AuthContext';
import { useHackathons } from '../context/HackathonContext';
import type { CSSProperties, ReactNode } from 'react';
import type { TaskStatus } from '../types/api';

export function Dashboard() {
  const { user } = useAuth();
  const { activeHackathon } = useHackathons();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
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
  const projectId = teamQuery.data?.project_id;
  const projectQuery = useQuery({ queryKey: ['project', projectId], queryFn: () => getProject(projectId!), enabled: Boolean(projectId) });
  const tasksQuery = useQuery({ queryKey: ['tasks', projectId], queryFn: () => getTasks(projectId!), enabled: Boolean(projectId) });
  const progressQuery = useQuery({ queryKey: ['progress', projectId], queryFn: () => getProgress(projectId!), enabled: Boolean(projectId) });
  const milestonesQuery = useQuery({ queryKey: ['milestones', projectId], queryFn: () => getMilestones(projectId!), enabled: Boolean(projectId) });
  const onboardingQuery = useQuery({
    queryKey: ['onboarding', activeHackathon?.id],
    queryFn: () => getOnboarding(activeHackathon!.id),
    enabled: Boolean(activeHackathon),
  });
  const taskMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => updateTask(id, { status }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['progress', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['onboarding', activeHackathon?.id] }),
      ]);
    },
  });

  if (!activeHackathon) return <div className="empty-state surface"><span className="eyebrow">No active hackathon</span><h1>Find your next build.</h1><p>There isn’t an active event available for your account.</p></div>;
  if (teamQuery.isLoading || (teamQuery.data && projectQuery.isLoading)) return <LoadingState />;
  if (teamQuery.isError && !(teamQuery.error instanceof ApiError && teamQuery.error.status === 404)) {
    return <ErrorState message={message(teamQuery.error)} retry={() => teamQuery.refetch()} />;
  }
  if (!teamQuery.data) return <div className="empty-state surface"><span className="eyebrow">{activeHackathon.title}</span><h1>Your team is the next step.</h1><p>Join this hackathon and make a team workspace.</p><Link className="button button-primary" to="/onboarding">Continue onboarding <ArrowRight size={16} /></Link></div>;
  if (projectQuery.isError) return <ErrorState message={message(projectQuery.error)} retry={() => projectQuery.refetch()} />;
  if (tasksQuery.isError || progressQuery.isError || milestonesQuery.isError) {
    const error = tasksQuery.error ?? progressQuery.error ?? milestonesQuery.error;
    return <ErrorState message={message(error)} retry={() => navigate(0)} />;
  }

  const project = projectQuery.data;
  const tasks = tasksQuery.data ?? [];
  const progress = progressQuery.data;
  const milestones = milestonesQuery.data ?? [];
  const onboarding = onboardingQuery.data;
  const firstName = user?.full_name.split(' ')[0] ?? 'there';
  const date = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());
  const remainingSteps = onboarding?.blockers.length ?? 0;
  const openBlockers = onboarding?.blockers.filter(item => item !== 'Submit your project') ?? [];

  return (
    <>
      <div className="page-heading dashboard-heading"><div><div className="eyebrow">{date} <span className="eyebrow-divider">/</span> {activeHackathon.title}</div><h1>Good morning, {firstName}<span className="heading-period">.</span></h1><p>A good idea gets better when it has a little structure.</p></div><Link className="button button-primary" to={project ? `/project/${project.id}` : '/onboarding'}><span>Open workspace</span><ArrowUpRight size={16} /></Link></div>
      <div className="metric-grid">
        <Metric icon={<Layers3 size={16} />} label="Onboarding" value={`${onboarding?.progress_percent ?? 0}%`} note={onboarding?.next_step ? `Next · ${onboarding.next_step.replaceAll('_', ' ').toLowerCase()}` : 'All steps complete'} />
        <Metric icon={<ListTodo size={16} />} label="Tasks completed" value={`${progress?.tasks_completed ?? 0} / ${progress?.tasks_total ?? 0}`} note={`${Math.max(0, (progress?.tasks_total ?? 0) - (progress?.tasks_completed ?? 0))} still in motion`} />
        <Metric icon={<UsersRound size={16} />} label="Team members" value={String(membersQuery.data?.length ?? '—')} note={teamQuery.data.name} />
        <Metric icon={<Clock3 size={16} />} label="Submission" value={progress?.submission_ready ? 'Ready' : 'In progress'} note={activeHackathon.end_time ? `Closes ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(activeHackathon.end_time))}` : ''} />
      </div>
      <div className="dashboard-top-grid">
        <article className="surface project-feature">
          <div className="feature-top"><div><div className="eyebrow">TEAM PROJECT</div><h2>{project?.title ?? 'Project workspace'}</h2></div><span className="status-tag"><i />BUILDING</span></div>
          <p className="feature-tagline">{project?.tagline || 'A new idea is taking shape.'}</p>
          <div className="progress-label"><span>COMPLETION</span><span>{progress?.completion_percent ?? 0}%</span></div>
          <div className="progress-track"><span style={{ width: `${progress?.completion_percent ?? 0}%` }} /></div>
          <div className="feature-meta"><div><span>REPOSITORY</span><strong>{project?.repository_url ? 'Connected' : 'Add a URL'}</strong></div><div><span>TECH STACK</span><strong>{project?.tech_stack?.join(' · ') || 'Not set'}</strong></div><div><span>TEAM</span><strong>{teamQuery.data.name}</strong></div></div>
          <Link className="feature-link" to={`/project/${project?.id}`}>Edit project <ArrowUpRight size={15} /></Link>
        </article>
        <article className="surface onboarding-summary">
          <div className="surface-heading"><h2>Getting started</h2><Link to="/onboarding">View path</Link></div>
          <div className="onboarding-summary-body"><div className="progress-ring" style={{ '--progress': `${onboarding?.progress_percent ?? 0}%` } as CSSProperties}><strong>{onboarding?.progress_percent ?? 0}<small>%</small></strong></div><div><strong>{remainingSteps} {remainingSteps === 1 ? 'step' : 'steps'} to go</strong><p>{onboarding?.blockers[0] ?? 'Your journey is complete.'}</p></div></div>
          <div className="next-action"><span>Next action</span><Link to="/onboarding">Keep moving <ArrowRight size={14} /></Link></div>
        </article>
      </div>
      <section className="surface task-section">
        <div className="section-heading"><div><h2>The work, in motion</h2><p>Move each task forward as your team makes progress.</p></div><Link className="button button-secondary button-small" to={`/project/${project?.id}`}>All tasks <ArrowRight size={14} /></Link></div>
        {taskMutation.isError && <div className="inline-error" role="alert">{message(taskMutation.error)}</div>}
        {tasksQuery.isLoading ? <LoadingState label="Loading tasks" /> : <TaskBoard tasks={tasks} busyId={taskMutation.variables?.id} onStatusChange={(id, status) => taskMutation.mutate({ id, status })} />}
      </section>
      <div className="dashboard-bottom-grid">
        <section className="surface milestone-summary"><div className="surface-heading"><h2>Milestones</h2><Link to={`/project/${project?.id}`}>Project plan <ArrowRight size={13} /></Link></div>
          {milestones.length ? milestones.slice(0, 3).map(milestone => <div className="milestone-row" key={milestone.id}><span className={`milestone-check ${milestone.is_completed ? 'checked' : ''}`}>{milestone.is_completed && <Check size={12} />}</span><span><strong>{milestone.title}</strong><small>{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(milestone.target_date))}</small></span></div>) : <p className="quiet-empty">No milestones yet.</p>}
        </section>
        <section className="surface blocker-summary"><div className="surface-heading"><h2>Submission readiness</h2><Link to="/submission">Review <ArrowRight size={13} /></Link></div>
          {progress?.submission_ready ? <div className="ready-line"><Check size={17} /> Required checks are clear.</div> : openBlockers.length ? openBlockers.slice(0, 3).map(item => <div className="blocker-row" key={item}><CircleAlert size={15} /><span>{item}</span></div>) : <p className="quiet-empty">Run a validation check to see remaining blockers.</p>}
        </section>
      </div>
    </>
  );
}

function Metric({ icon, label, value, note }: { icon: ReactNode; label: string; value: string; note: string }) {
  return <article className="surface metric-card"><span className="metric-icon">{icon}</span><span className="metric-label">{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to load this information.';
}