import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, ArrowUpRight, CalendarClock, LoaderCircle, Save, UsersRound } from 'lucide-react';
import { createHackathon, getHackathonAnalytics, updateHackathon } from '../api/hackathons';
import { ErrorState, LoadingState } from '../components/ui/AsyncState';
import { useHackathons } from '../context/HackathonContext';

export function AdminPage() {
  const { activeHackathon, chooseHackathon } = useHackathons();
  const queryClient = useQueryClient();
  const [createTitle, setCreateTitle] = useState('');
  const [createStart, setCreateStart] = useState(localDateTime(Date.now() + 7 * 86_400_000));
  const [createEnd, setCreateEnd] = useState(localDateTime(Date.now() + 9 * 86_400_000));
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState('');
  const analyticsQuery = useQuery({
    queryKey: ['hackathon-analytics', activeHackathon?.id],
    queryFn: () => getHackathonAnalytics(activeHackathon!.id),
    enabled: Boolean(activeHackathon),
  });

  useEffect(() => {
    if (!activeHackathon) return;
    setTitle(activeHackathon.title);
    setStart(localDateTime(new Date(activeHackathon.start_time).getTime()));
    setEnd(localDateTime(new Date(activeHackathon.end_time).getTime()));
  }, [activeHackathon]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['hackathons'] });
    await queryClient.invalidateQueries({ queryKey: ['hackathon-analytics'] });
  };
  const createMutation = useMutation({
    mutationFn: () => createHackathon({
      title: createTitle,
      start_time: new Date(createStart).toISOString(),
      end_time: new Date(createEnd).toISOString(),
    }),
    onSuccess: async event => {
      await refresh();
      chooseHackathon(event.id);
      setCreateTitle('');
      setError('');
    },
    onError: reason => setError(message(reason)),
  });
  const updateMutation = useMutation({
    mutationFn: () => updateHackathon(activeHackathon!.id, {
      title,
      start_time: new Date(start).toISOString(),
      end_time: new Date(end).toISOString(),
    }),
    onSuccess: async () => { await refresh(); setError(''); },
    onError: reason => setError(message(reason)),
  });

  if (!activeHackathon) return <div className="empty-state surface"><span className="eyebrow">Organizer</span><h1>Create the next event.</h1><p>Set an event timeline to open registration for participants.</p><CreateEventForm title={createTitle} setTitle={setCreateTitle} start={createStart} setStart={setCreateStart} end={createEnd} setEnd={setCreateEnd} busy={createMutation.isPending} onSubmit={event => { event.preventDefault(); createMutation.mutate(); }} error={error} /></div>;

  function saveTimeline(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    updateMutation.mutate();
  }

  function addEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    createMutation.mutate();
  }

  const analytics = analyticsQuery.data;
  return (
    <>
      <div className="page-heading"><div><div className="eyebrow">Organizer / Overview</div><h1>Keep the event moving.</h1><p>Timeline, participation, and project completion at a glance.</p></div><span className="status-tag"><i />ORGANIZER VIEW</span></div>
      <section className="admin-metrics">
        <AdminMetric icon={<UsersRound size={17} />} label="Participants" value={analytics?.participants} note="Registered for this event" />
        <AdminMetric icon={<Activity size={17} />} label="Teams formed" value={analytics?.teams} note={`${analytics?.onboarding_dropoff ?? 0} participants still solo`} />
        <AdminMetric icon={<ArrowUpRight size={17} />} label="Projects" value={analytics?.projects} note="Team workspaces created" />
        <AdminMetric icon={<CalendarClock size={17} />} label="Submitted" value={analytics?.submitted_projects} note="Final deliverables received" />
      </section>
      <div className="admin-grid">
        <section className="surface admin-timeline"><div className="section-heading"><div><h2>Event timeline</h2><p>{activeHackathon.title}</p></div><CalendarClock size={18} color="#587261" /></div>
          <form className="setup-form admin-form" onSubmit={saveTimeline}><label>Event name<input required value={title} onChange={event => setTitle(event.target.value)} maxLength={255} /></label><label>Starts<input required type="datetime-local" value={start} onChange={event => setStart(event.target.value)} /></label><label>Ends<input required type="datetime-local" value={end} onChange={event => setEnd(event.target.value)} /></label><button className="button button-primary" disabled={updateMutation.isPending}>{updateMutation.isPending ? <LoaderCircle className="spin" size={15} /> : <Save size={15} />} Save timeline</button></form>
        </section>
        <section className="surface admin-event-list"><div className="section-heading"><div><h2>Available events</h2><p>Switch the active organizer view.</p></div></div>
          <div className="admin-event-row"><span><strong>{activeHackathon.title}</strong><small>{new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(activeHackathon.start_time))} – {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(activeHackathon.end_time))}</small></span><span className="current-event">CURRENT</span></div>
        </section>
      </div>
      <section className="surface admin-create"><div className="section-heading"><div><h2>Set up another event</h2><p>Create a new hackathon timeline.</p></div></div>
        <CreateEventForm title={createTitle} setTitle={setCreateTitle} start={createStart} setStart={setCreateStart} end={createEnd} setEnd={setCreateEnd} busy={createMutation.isPending} onSubmit={addEvent} error={error} />
      </section>
      {analyticsQuery.isLoading && <LoadingState label="Loading event analytics" />}
      {analyticsQuery.isError && <ErrorState message={message(analyticsQuery.error)} retry={() => analyticsQuery.refetch()} />}
      {(createMutation.isError || updateMutation.isError) && <div className="inline-error" role="alert">{error}</div>}
    </>
  );
}

function CreateEventForm({ title, setTitle, start, setStart, end, setEnd, busy, onSubmit, error }: {
  title: string;
  setTitle: (value: string) => void;
  start: string;
  setStart: (value: string) => void;
  end: string;
  setEnd: (value: string) => void;
  busy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  error: string;
}) {
  return <form className="admin-create-form" onSubmit={onSubmit}><input aria-label="New event name" required value={title} onChange={event => setTitle(event.target.value)} maxLength={255} placeholder="Event name" /><input aria-label="New event start" required type="datetime-local" value={start} onChange={event => setStart(event.target.value)} /><input aria-label="New event end" required type="datetime-local" value={end} onChange={event => setEnd(event.target.value)} /><button className="button button-primary" disabled={busy}>{busy ? <LoaderCircle className="spin" size={15} /> : <Save size={15} />} Create event</button>{error && <span className="inline-error" role="alert">{error}</span>}</form>;
}

function AdminMetric({ icon, label, value, note }: { icon: ReactNode; label: string; value?: number; note: string }) {
  return <article className="surface admin-metric"><span className="metric-icon">{icon}</span><span className="metric-label">{label}</span><strong>{value ?? '—'}</strong><small>{note}</small></article>;
}

function localDateTime(timestamp: number) {
  const date = new Date(timestamp);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to load this information.';
}