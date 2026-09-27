export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'participant' | 'admin';
}

export interface TokenResponse {
  access_token: string;
  token_type: 'bearer';
}

export interface Hackathon {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface Team {
  id: string;
  hackathon_id: string;
  name: string;
  invite_code: string;
  leader_id: string;
}

export interface TeamWorkspace extends Team {
  project_id: string;
}

export interface Project {
  id: string;
  team_id: string;
  title: string;
  tagline: string | null;
  description: string | null;
  repository_url: string | null;
  demo_url: string | null;
  tech_stack: string[] | null;
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED';

export interface Task {
  id: string;
  project_id: string;
  title: string;
  status: TaskStatus;
  due_date: string | null;
  assignee_id: string | null;
}

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  target_date: string;
  is_completed: boolean;
}

export interface Progress {
  tasks_total: number;
  tasks_completed: number;
  milestones_total: number;
  milestones_completed: number;
  completion_percent: number;
  submission_ready: boolean;
}

export interface OnboardingStatus {
  current_step: string;
  next_step: string | null;
  progress_percent: number;
  blockers: string[];
}

export interface ValidationCheck {
  key: string;
  passed: boolean;
}

export interface ValidationResult {
  ready: boolean;
  errors: string[];
  warnings: string[];
  checks: ValidationCheck[];
}

export interface Submission {
  id: string;
  project_id: string;
  video_url: string | null;
  documentation: string | null;
  is_submitted: boolean;
  submitted_at: string | null;
}

export interface AIBreakdown {
  summary: string;
  provider: string;
  tasks: { title: string; status: 'TODO' }[];
}

export interface AIReview {
  ready: boolean;
  feedback: string[];
  validation: ValidationResult;
}

export interface TeamMember {
  id: string;
  email: string;
  full_name: string;
}

export interface ApiErrorPayload {
  error?: { code?: string; message?: string; details?: unknown };
}

export interface HackathonAnalytics {
  participants: number;
  teams: number;
  projects: number;
  submitted_projects: number;
  onboarding_dropoff: number;
}