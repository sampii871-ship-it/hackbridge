import { jsonBody, request } from './client';
import type { Milestone, Progress, Project, Task, TaskStatus } from '../types/api';

export const getProject = (id: string): Promise<Project> => request(`/projects/${id}`);
export const getProgress = (id: string): Promise<Progress> => request(`/projects/${id}/progress`);
export const updateProject = (id: string, values: Partial<Project>): Promise<Project> =>
  request(`/projects/${id}`, { method: 'PATCH', body: jsonBody(values) });

export const getTasks = (id: string): Promise<Task[]> => request(`/projects/${id}/tasks`);
export const createTask = (projectId: string, title: string, due_date?: string): Promise<Task> =>
  request(`/projects/${projectId}/tasks`, {
    method: 'POST',
    body: jsonBody({ title, due_date: due_date || null }),
  });
export const updateTask = (id: string, values: { status?: TaskStatus; title?: string }): Promise<Task> =>
  request(`/tasks/${id}`, { method: 'PATCH', body: jsonBody(values) });

export const getMilestones = (id: string): Promise<Milestone[]> => request(`/projects/${id}/milestones`);
export const createMilestone = (projectId: string, title: string, target_date: string): Promise<Milestone> =>
  request(`/projects/${projectId}/milestones`, {
    method: 'POST',
    body: jsonBody({ title, target_date }),
  });
export const updateMilestone = (id: string, values: { is_completed?: boolean }): Promise<Milestone> =>
  request(`/milestones/${id}`, { method: 'PATCH', body: jsonBody(values) });