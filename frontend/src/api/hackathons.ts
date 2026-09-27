import { jsonBody, request } from './client';
import type { Hackathon, HackathonAnalytics, OnboardingStatus } from '../types/api';

export const listHackathons = (): Promise<Hackathon[]> => request('/hackathons');

export const joinHackathon = (id: string): Promise<{ status: string }> =>
  request(`/hackathons/${id}/join`, { method: 'POST' });

export const getOnboarding = (id: string): Promise<OnboardingStatus> =>
  request(`/hackathons/${id}/onboarding`);

export const getHackathonAnalytics = (id: string): Promise<HackathonAnalytics> =>
  request(`/hackathons/${id}/analytics`);

export const createHackathon = (input: {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
}): Promise<Hackathon> => request('/hackathons', { method: 'POST', body: jsonBody(input) });

export const updateHackathon = (id: string, input: {
  title?: string;
  description?: string | null;
  start_time?: string;
  end_time?: string;
  is_active?: boolean;
}): Promise<Hackathon> => request(`/hackathons/${id}`, { method: 'PATCH', body: jsonBody(input) });