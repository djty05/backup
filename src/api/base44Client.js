import { createClient } from '@base44/sdk';

export const base44 = createClient({
  appId: "69b9ee2e21d1a8f05796536b",
  requiresAuth: false,
});

export async function requireAuth() {
  const isAuth = await base44.auth.isAuthenticated();
  if (!isAuth) {
    throw new Error('Workspace access required');
  }
}