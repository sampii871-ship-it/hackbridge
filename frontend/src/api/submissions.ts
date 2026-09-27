import { jsonBody, request } from './client';
import type { Submission, ValidationResult } from '../types/api';

export const getSubmission = (projectId: string): Promise<Submission | null> =>
  request(`/projects/${projectId}/submission`);

export const validateSubmission = (projectId: string): Promise<ValidationResult> =>
  request(`/projects/${projectId}/submission/validate`, { method: 'POST' });

export const saveSubmission = (
  projectId: string,
  values: { video_url: string | null; documentation: string },
): Promise<Submission> => request(`/projects/${projectId}/submission`, {
  method: 'PATCH',
  body: jsonBody(values),
});

export const submitProject = (projectId: string): Promise<Submission> =>
  request(`/projects/${projectId}/submission/submit`, { method: 'POST' });