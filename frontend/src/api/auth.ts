import { jsonBody, request, tokenStore } from './client';
import type { TokenResponse, User } from '../types/api';

export async function login(email: string, password: string): Promise<User> {
  const token = await request<TokenResponse>('/auth/login', {
    method: 'POST',
    body: jsonBody({ email, password }),
  });
  tokenStore.set(token.access_token);
  return request<User>('/users/me');
}

export async function register(full_name: string, email: string, password: string): Promise<User> {
  await request<User>('/auth/register', {
    method: 'POST',
    body: jsonBody({ full_name, email, password }),
  });
  return login(email, password);
}

export const currentUser = (): Promise<User> => request<User>('/users/me');