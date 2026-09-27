import type { Task, TaskStatus } from '../../types/api';

const columns: { status: TaskStatus; label: string }[] = [
  { status: 'TODO', label: 'To do' },
  { status: 'IN_PROGRESS', label: 'In progress' },
  { status: 'COMPLETED', label: 'Done' },
];

export function TaskBoard({ tasks, onStatusChange, busyId }: {
  tasks: Task[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  busyId?: string;
}) {
  return (
    <div className="task-board">
      {columns.map(column => {
        const items = tasks.filter(task => task.status === column.status);
        return (
          <section className="task-column" key={column.status}>
            <div className="column-heading"><span>{column.label}</span><span>{String(items.length).padStart(2, '0')}</span></div>
            {items.length ? items.map(task => (
              <article className="task-card" key={task.id}>
                <h3>{task.title}</h3>
                <div className="task-card-foot">
                  <select
                    aria-label={`Status for ${task.title}`}
                    value={task.status}
                    disabled={busyId === task.id}
                    onChange={event => onStatusChange(task.id, event.target.value as TaskStatus)}
                  >
                    {columns.map(option => <option value={option.status} key={option.status}>{option.label}</option>)}
                  </select>
                  <span>{task.due_date ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(task.due_date)) : 'No due date'}</span>
                </div>
              </article>
            )) : <div className="empty-column">Nothing here yet</div>}
          </section>
        );
      })}
    </div>
  );
}