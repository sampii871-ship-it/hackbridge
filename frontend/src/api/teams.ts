import { jsonBody, request } from './client';
import type { Team, TeamMember, TeamWorkspace } from '../types/api';

export const getMyTeam = (hackathonId: string): Promise<TeamWorkspace> =>
  request(`/teams/me?hackathon_id=${encodeURIComponent(hackathonId)}`);

export const createTeam = (hackathonId: string, name: string, project_title: string): Promise<TeamWorkspace> =>
  request(`/teams/hackathons/${hackathonId}`, {
    method: 'POST',
    body: jsonBody({ name, project_title }),
  });

export const joinTeam = (invite_code: string): Promise<Team> =>
  request('/teams/join', { method: 'POST', body: jsonBody({ invite_code }) });

export const renameTeam = (id: string, name: string): Promise<Team> =>
  request(`/teams/${id}`, { method: 'PATCH', body: jsonBody({ name }) });

export const getTeamMembers = (id: string): Promise<TeamMember[]> => request(`/teams/${id}/members`);