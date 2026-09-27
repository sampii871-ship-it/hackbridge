import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowUpRight, Bot, Check, CirclePlus, LoaderCircle, Save } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { generateBreakdown } from '../api/ai';
import { createMilestone, createTask, getMilestones, getProgress, getProject, getTasks, updateMilestone, updateProject, updateTask } from '../api/projects';
import { ErrorState, LoadingState } from '../components/ui/AsyncState';
import type { AIBreakdown, Project as ProjectType, TaskStatus } from '../types/api';

export function ProjectPage() {
  const { projectId = '' } = useParams();
  const queryClient = useQueryClient();
  const [projectDraft, setProjectDraft] = useState<ProjectType | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDate, setMilestoneDate] = useState('');
  const [idea, setIdea] = useState('');
  const [plan, setPlan] = useState<AIBreakdown | null>(null);
  const [notice, setNotice] = useState('');

  const projectQuery = useQuery({ queryKey: ['project', projectId], queryFn: () => getProject(projectId), enabled: Boolean(projectId) });
  const tasksQuery = useQuery({ queryKey: ['tasks', projectId], queryFn: () => getTasks(projectId), enabled: Boolean(projectId) });
  const milestonesQuery = useQuery({ queryKey: ['milestones', projectId], queryFn: () => getMilestones(projectId), enabled: Boolean(projectId) });
  const progressQuery = useQuery({ queryKey: ['progress', projectId], queryFn: () => getProgress(projectId), enabled: Boolean(projectId) });

  useEffect(() => {
    if (projectQuery.data) setProjectDraft(projectQuery.data);
  }, [projectQuery.data]);

  const refreshWorkspace = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['project', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['milestones', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['progress', projectId] }),
    ]);
  };
  const saveProject = useMutation({ mutationFn: () => updateProject(projectId, projectDraft!), onSuccess: refreshWorkspace });
  const addTask = useMutation({ mutationFn: () => createTask(projectId, taskTitle, taskDue || undefined), onSuccess: async () => { setTaskTitle(''); setTaskDue(''); await refreshWorkspace(); } });
  const changeTask = useMutation({ mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => updateTask(id, { status }), onSuccess: refreshWorkspace });
  const addMilestone = useMutation({ mutationFn: () => createMilestone(projectId, milestoneTitle, new Date(milestoneDate).toISOString()), onSuccess: async () => { setMilestoneTitle(''); setMilestoneDate(''); await refreshWorkspace(); } });
  const changeMilestone = useMutation({ mutationFn: ({ id, done }: { id: string; done: boolean }) => updateMilestone(id, { is_completed: done }), onSuccess: refreshWorkspace });
  const askAI = useMutation({ mutationFn: () => generateBreakdown(idea), onSuccess: setPlan });
  const addSuggestedTask = useMutation({
    mutationFn: (title: string) => createTask(projectId, title),
    onSuccess: async () => { await refreshWorkspace(); setNotice('Suggested task added to the board.'); },
  });

  if (projectQuery.isLoading) return <LoadingState label="Loading project" />;
  if (projectQuery.isError) return <ErrorState message={message(projectQuery.error)} retry={() => projectQuery.refetch()} />;
  if (!projectDraft) return null;

  function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    saveProject.mutate();
  }

  function addNewTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addTask.mutate();
  }

  function addNewMilestone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addMilestone.mutate();
  }

  function updateDraft(field: keyof ProjectType, value: string | string[] | null) {
    setProjectDraft(current => current ? { ...current, [field]: value } : current);
  }

  return (
    <>
      <div className="page-heading"><div><Link className="back-link" to="/dashboard"><ArrowLeft size={14} /> Workspace</Link><div className="eyebrow">Project / Details</div><h1>{projectDraft.title || 'Project workspace'}</h1><p>{projectDraft.tagline || 'A home for the idea, the plan, and the work.'}</p></div><Link className="button button-secondary" to="/submission">Submission <ArrowUpRight size={15} /></Link></div>
      <div className="project-page-grid">
        <div className="project-main-column">
          <section className="surface project-form-panel"><div className="section-heading"><div><h2>Project profile</h2><p>Give the idea a clear shape.</p></div><span className="subtle-tag">EDITABLE</span></div>
            <form className="project-form" onSubmit={saveDetails}>
              <label>Project name<input required maxLength={255} value={projectDraft.title} onChange={event => updateDraft('title', event.target.value)} /></label>
              <label>Tagline<input maxLength={500} value={projectDraft.tagline ?? ''} onChange={event => updateDraft('tagline', event.target.value || null)} placeholder="A little closer to the places we share." /></label>
              <label className="field-wide">Description<textarea rows={4} maxLength={10000} value={projectDraft.description ?? ''} onChange={event => updateDraft('description', event.target.value || null)} /></label>
              <label>Repository URL<input type="url" value={projectDraft.repository_url ?? ''} onChange={event => updateDraft('repository_url', event.target.value || null)} placeholder="https://github.com/team/project" /></label>
              <label>Demo URL <span className="field-note">Optional</span><input type="url" value={projectDraft.demo_url ?? ''} onChange={event => updateDraft('demo_url', event.target.value || null)} placeholder="https://" /></label>
              <label className="field-wide">Tech stack <span className="field-note">Separate with commas</span><input value={projectDraft.tech_stack?.join(', ') ?? ''} onChange={event => updateDraft('tech_stack', event.target.value.split(',').map(item => item.trim()).filter(Boolean))} /></label>
              <div className="form-actions field-wide">{saveProject.isSuccess && <span className="saved-note"><Check size={14} /> Saved</span>}<button className="button button-primary" disabled={saveProject.isPending}>{saveProject.isPending ? <LoaderCircle className="spin" size={16} /> : <Save size={15} />} Save project</button></div>
              {saveProject.isError && <div className="inline-error field-wide" role="alert">{message(saveProject.error)}</div>}
            </form>
          </section>
          <section className="surface task-management"><div className="section-heading"><div><h2>Task board <span className="count-label">{tasksQuery.data?.length ?? 0}</span></h2><p>Make the next step visible.</p></div></div>
            <form className="inline-create-form" onSubmit={addNewTask}><input aria-label="New task title" value={taskTitle} onChange={event => setTaskTitle(event.target.value)} required maxLength={255} placeholder="Add a task to the board" /><input aria-label="Task due date" type="date" value={taskDue} onChange={event => setTaskDue(event.target.value)} /><button className="button button-primary" disabled={addTask.isPending}><CirclePlus size={15} /> Add task</button></form>
            {tasksQuery.isLoading ? <LoadingState label="Loading tasks" /> : (tasksQuery.data ?? []).map(task => <div className="task-list-row" key={task.id}><span className={`task-status-mark ${task.status.toLowerCase()}`} /><span className="task-list-title">{task.title}<small>{task.due_date ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(task.due_date)) : 'No due date'}</small></span><select aria-label={`Status for ${task.title}`} value={task.status} disabled={changeTask.isPending} onChange={event => changeTask.mutate({ id: task.id, status: event.target.value as TaskStatus })}><option value="TODO">To do</option><option value="IN_PROGRESS">In progress</option><option value="COMPLETED">Done</option></select></div>)}
            {addTask.isError && <div className="inline-error" role="alert">{message(addTask.error)}</div>}{changeTask.isError && <div className="inline-error" role="alert">{message(changeTask.error)}</div>}
          </section>
          <section className="surface milestone-management"><div className="section-heading"><div><h2>Milestones <span className="count-label">{milestonesQuery.data?.length ?? 0}</span></h2><p>Agree on the markers that matter.</p></div></div>
            <form className="inline-create-form milestone-create-form" onSubmit={addNewMilestone}><input aria-label="Milestone title" value={milestoneTitle} onChange={event => setMilestoneTitle(event.target.value)} required maxLength={255} placeholder="Name a milestone" /><input aria-label="Milestone target date" type="datetime-local" value={milestoneDate} onChange={event => setMilestoneDate(event.target.value)} required /><button className="button button-secondary" disabled={addMilestone.isPending}><CirclePlus size={15} /> Add milestone</button></form>
            {(milestonesQuery.data ?? []).map(item => <div className="milestone-row" key={item.id}><button className={`milestone-check ${item.is_completed ? 'checked' : ''}`} onClick={() => changeMilestone.mutate({ id: item.id, done: !item.is_completed })} aria-label={item.is_completed ? `Reopen ${item.title}` : `Complete ${item.title}`}>{item.is_completed && <Check size={12} />}</button><span><strong>{item.title}</strong><small>{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(item.target_date))}</small></span></div>)}
            {addMilestone.isError && <div className="inline-error" role="alert">{message(addMilestone.error)}</div>}
          </section>
        </div>
        <aside className="project-side-column">
          <section className="surface project-pulse"><div className="eyebrow">PROJECT PULSE</div><div className="pulse-number">{progressQuery.data?.completion_percent ?? 0}<small>%</small></div><div className="progress-track"><span style={{ width: `${progressQuery.data?.completion_percent ?? 0}%` }} /></div><div className="pulse-details"><span>DONE<strong>{progressQuery.data?.tasks_completed ?? 0} tasks</strong></span><span>IN PROGRESS<strong>{(tasksQuery.data ?? []).filter(task => task.status === 'IN_PROGRESS').length} tasks</strong></span></div></section>
          <section className="surface ai-panel"><div className="ai-heading"><span><Bot size={17} /></span><div><strong>Idea to action</strong><small>AI project planning</small></div></div><label htmlFor="ideaDescription">Describe the idea you’re working on</label><textarea id="ideaDescription" rows={4} value={idea} onChange={event => setIdea(event.target.value)} placeholder="What are you building, and who is it for?" /><button className="button button-secondary button-wide" disabled={askAI.isPending || idea.trim().length < 10} onClick={() => askAI.mutate()}>{askAI.isPending ? 'Thinking…' : 'Suggest a task plan'} <ArrowUpRight size={15} /></button>
            {askAI.isError && <div className="inline-error" role="alert">{message(askAI.error)}</div>}
            {plan && <div className="suggestion-list"><p>{plan.summary}</p>{plan.tasks.map(task => <div className="suggestion-row" key={task.title}><span>{task.title}</span><button disabled={addSuggestedTask.isPending} onClick={() => addSuggestedTask.mutate(task.title)} aria-label={`Add ${task.title}`}>+</button></div>)}</div>}
            {addSuggestedTask.isError && <div className="inline-error" role="alert">{message(addSuggestedTask.error)}</div>}
            {notice && <div className="saved-note"><Check size={14} /> {notice}</div>}
          </section>
        </aside>
      </div>
    </>
  );
}

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to load this information.';
}