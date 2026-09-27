import { jsonBody, request } from './client';
import type { AIBreakdown, AIReview } from '../types/api';

export const generateBreakdown = (idea_description: string): Promise<AIBreakdown> =>
  request('/ai/breakdown', { method: 'POST', body: jsonBody({ idea_description }) });

export const reviewProject = (projectId: string): Promise<AIReview> =>
  request(`/ai/projects/${projectId}/review`, { method: 'POST' });