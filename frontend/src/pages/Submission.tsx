import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CircleCheck, LoaderCircle, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getMyTeam } from '../api/teams';
import { getProject } from '../api/projects';
import { getSubmission, saveSubmission, submitProject, validateSubmission } from '../api/submissions';
import { useHackathons } from '../context/HackathonContext';
import { ErrorState, LoadingState } from '../components/ui/AsyncState';
import type { ValidationResult } from '../types/api';

export function SubmissionPage() {
  const { activeHackathon } = useHackathons();
  const queryClient = useQueryClient();
  const [videoUrl, setVideoUrl] = useState('');
  const [documentation, setDocumentation] = useState('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [error, setError] = useState('');
  const teamQuery = useQuery({ queryKey: ['team', activeHackathon?.id], queryFn: () => getMyTeam(activeHackathon!.id), enabled: Boolean(activeHackathon) });
  const projectId = teamQuery.data?.project_id;
  const projectQuery = useQuery({ queryKey: ['project', projectId], queryFn: () => getProject(projectId!), enabled: Boolean(projectId) });
  const submissionQuery = useQuery({ queryKey: ['submission', projectId], queryFn: () => getSubmission(projectId!), enabled: Boolean(projectId) });

  useEffect(() => {
    setVideoUrl(submissionQuery.data?.video_url ?? '');
    setDocumentation(submissionQuery.data?.documentation ?? '');
  }, [submissionQuery.data]);

  const validate = useMutation({
    mutationFn: () => validateSubmission(projectId!),
    onSuccess: result => { setValidation(result); setError(''); },
    onError: reason => setError(message(reason)),
  });
  const save = useMutation({
    mutationFn: () => saveSubmission(projectId!, { video_url: videoUrl || null, documentation }),
    onSuccess: async () => {
      setError('');
      setValidation(null);
      await queryClient.invalidateQueries({ queryKey: ['submission', projectId] });
    },
    onError: reason => setError(message(reason)),
  });
  const submit = useMutation({
    mutationFn: () => submitProject(projectId!),
    onSuccess: async () => {
      setError('');
      await queryClient.invalidateQueries({ queryKey: ['submission', projectId] });
      await queryClient.invalidateQueries({ queryKey: ['onboarding', activeHackathon?.id] });
    },
    onError: reason => setError(message(reason)),
  });

  if (!activeHackathon) return <div className="empty-state surface"><h1>No event selected.</h1><p>Choose an event before submitting.</p></div>;
  if (teamQuery.isLoading || (projectId && (projectQuery.isLoading || submissionQuery.isLoading))) return <LoadingState label="Loading submission" />;
  if (teamQuery.isError) return <ErrorState message={message(teamQuery.error)} />;
  if (!projectId || !projectQuery.data) return <div className="empty-state surface"><span className="eyebrow">{activeHackathon.title}</span><h1>Make a team first.</h1><p>Your submission is attached to a team project.</p><Link className="button button-primary" to="/onboarding">Open onboarding</Link></div>;

  const isSubmitted = submissionQuery.data?.is_submitted ?? false;
  const canSubmit = validation?.ready === true && !isSubmitted;

  return (
    <>
      <div className="page-heading"><div><Link className="back-link" to={`/project/${projectId}`}><ArrowLeft size={14} /> Project</Link><div className="eyebrow">Workspace / Final submission</div><h1>{isSubmitted ? 'You made it official.' : 'Make it official.'}</h1><p>{isSubmitted ? 'Your project has been sent to the review queue.' : 'Check the essentials, then send your project out into the world.'}</p></div>{isSubmitted && <span className="status-tag status-tag-ready"><i />SUBMITTED</span>}</div>
      <div className="submission-layout">
        <section className="surface submission-form-panel"><div className="section-heading"><div><h2>Submission details</h2><p>Project profile · {projectQuery.data.title}</p></div></div>
          <div className="submission-project-summary"><span className="summary-mark">HB</span><span><strong>{projectQuery.data.title}</strong><small>{projectQuery.data.tagline || 'No tagline added'}</small></span></div>
          <label className="submission-field">Repository URL<input value={projectQuery.data.repository_url ?? ''} readOnly /></label>
          <label className="submission-field">Demo URL <span className="field-note">Optional</span><input type="url" value={videoUrl} onChange={event => { setVideoUrl(event.target.value); setValidation(null); }} disabled={isSubmitted} placeholder="https://your-demo.example" /></label>
          <label className="submission-field">Documentation <span className="field-note">Optional</span><textarea rows={7} maxLength={20000} value={documentation} onChange={event => setDocumentation(event.target.value)} disabled={isSubmitted} placeholder="Add setup notes or anything reviewers should know." /></label>
          <div className="submission-form-actions"><button className="button button-secondary" onClick={() => validate.mutate()} disabled={validate.isPending || isSubmitted}>{validate.isPending ? <LoaderCircle className="spin" size={15} /> : <ShieldCheck size={15} />} Run validation</button><button className="button button-primary" onClick={() => save.mutate()} disabled={save.isPending || isSubmitted}>{save.isPending ? 'Saving…' : 'Save details'}</button></div>
          {save.isError && <div className="inline-error" role="alert">{message(save.error)}</div>}
        </section>
        <aside className="submission-side-column">
          <section className="surface validation-panel"><div className="validation-title"><div className="validation-mark"><ShieldCheck size={19} /></div><div><h2>Submission check</h2><p>{validation ? `${validation.checks.filter(check => check.passed).length} of ${validation.checks.length} requirements passed` : 'Run a check to see your current readiness.'}</p></div></div>
            {validation ? <div className="validation-list">{validation.checks.map(check => <div className="validation-row" key={check.key}><span>{check.key.replaceAll('_', ' ')}</span><span className={check.passed ? 'pass-label' : 'fail-label'}>{check.passed ? <><Check size={13} /> PASSED</> : <><AlertTriangle size={13} /> NEEDS WORK</>}</span></div>)}</div> : <div className="validation-empty"><span>01</span><p>Server-side checks cover project information, the repository URL, and a first task.</p></div>}
            {validation?.errors.map(item => <div className="validation-message validation-message-error" key={item}><AlertTriangle size={14} /> {item}</div>)}
            {validation?.warnings.map(item => <div className="validation-message" key={item}><CircleCheck size={14} /> {item}</div>)}
            {error && <div className="inline-error" role="alert">{error}</div>}
            {isSubmitted ? <div className="submission-success"><CircleCheck size={17} /> Submitted {submissionQuery.data?.submitted_at ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(submissionQuery.data.submitted_at)) : ''}</div> : <button className="button button-primary button-wide submit-button" disabled={!canSubmit || submit.isPending} onClick={() => submit.mutate()}>{submit.isPending ? 'Submitting…' : 'Submit project'} <ArrowRight size={15} /></button>}
          </section>
          <section className="surface deadline-panel"><span className="eyebrow">SUBMISSION WINDOW</span><strong>{new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(activeHackathon.end_time))}</strong><p>Changes close when the event ends.</p></section>
        </aside>
      </div>
    </>
  );
}

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to load this information.';
}