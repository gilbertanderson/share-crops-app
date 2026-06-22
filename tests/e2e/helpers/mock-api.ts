import type { Page, Route } from '@playwright/test';
import type { Community, User } from '../../../src/types';

/**
 * Network-level mock for the Share Crops backend (a Supabase Edge Function).
 *
 * The real app talks to `https://<project>.supabase.co/functions/v1/make-server-dd877831/*`
 * and keeps its session token in `localStorage['sharecrops_token']`. These helpers let an
 * e2e test "log in" without a live backend, in two ways:
 *
 *   1. `installApiMocks(page)` — intercept every Edge Function call and return deterministic
 *      fixtures, so the real login form + routing run end-to-end against a fake API.
 *   2. `seedAuthSession(page)` — drop a token straight into storage so a test starts already
 *      authenticated, skipping the login UI entirely.
 *
 * Combine them to drive a full login through the form, or to jump straight into the app.
 */

// Matches the Edge Function base regardless of which Supabase project id is configured.
const EDGE_FUNCTION_GLOB = '**/functions/v1/make-server-dd877831/**';

export const TEST_CREDENTIALS = {
  email: 'tomato.grower@testcrops.dev',
  // Satisfies the client-side password policy (8+ chars, uppercase, number).
  password: 'TempPassword123!',
};

export const MOCK_TOKEN = 'mock-access-token-e2e';

export const mockUser: User = {
  id: 'user-mock-1',
  email: TEST_CREDENTIALS.email,
  name: 'Tomato Grower',
  bio: 'I grow heirloom tomatoes and trade for fresh herbs.',
  socialUrl: undefined,
  profilePhotoUrl: undefined,
  rating: 4.5,
  ratingCount: 12,
  role: 'general',
  createdAt: '2026-01-01T00:00:00.000Z',
};

export const mockCommunity: Community = {
  id: 'community-mock-1',
  name: 'Riverside Gardeners',
  zipCode: '94110',
  createdBy: mockUser.id,
  memberCount: 8,
  createdAt: '2026-01-01T00:00:00.000Z',
};

export interface MockApiOptions {
  /** Communities returned by `/communities/mine` + `/communities/my`. Empty = needs setup. */
  communities?: Community[];
  /** The signed-in user returned by login + `/auth/me`. */
  user?: User;
  /** Override the `/auth/login` response to simulate a rejected sign-in. */
  loginError?: { status: number; message: string };
}

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

/**
 * Intercepts all backend calls and answers them from in-memory fixtures.
 * Register this before navigating so the very first request is mocked.
 */
export async function installApiMocks(page: Page, options: MockApiOptions = {}): Promise<void> {
  const user = options.user ?? mockUser;
  const communities = options.communities ?? [mockCommunity];

  await page.route(EDGE_FUNCTION_GLOB, async (route: Route) => {
    const request = route.request();
    const method = request.method();
    const path = new URL(request.url()).pathname.split('make-server-dd877831')[1] ?? '';

    const json = (status: number, body: unknown) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify(body),
      });

    // CORS preflight for the cross-origin Edge Function calls.
    if (method === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS_HEADERS, body: '' });
    }

    // --- Auth ---
    if (path === '/auth/login' && method === 'POST') {
      if (options.loginError) {
        return json(options.loginError.status, { error: options.loginError.message });
      }
      return json(200, { user, accessToken: MOCK_TOKEN });
    }
    if (path === '/auth/me') {
      return json(200, { user });
    }

    // --- Communities ---
    if (path === '/communities/mine') {
      return json(200, { communities, activeCommunityId: communities[0]?.id ?? null });
    }
    if (path === '/communities/my') {
      return json(200, { community: communities[0] ?? null });
    }

    // --- Everything else the app polls on load: answer with empty collections ---
    if (path.startsWith('/listings')) return json(200, { listings: [] });
    if (path.startsWith('/offers')) return json(200, { offers: [] });
    if (path.startsWith('/chat/threads')) return json(200, { threads: [] });
    if (path.startsWith('/trending')) return json(200, { items: [] });

    return json(200, {});
  });
}

/**
 * Seeds an authenticated session directly into browser storage so the app boots logged in.
 * Runs before any page script on every navigation (Playwright `addInitScript`).
 */
export async function seedAuthSession(
  page: Page,
  opts: { user?: User; communitySelected?: boolean } = {}
): Promise<void> {
  const user = opts.user ?? mockUser;
  const communitySelected = opts.communitySelected ?? true;

  await page.addInitScript(
    ({ token, userJson, markCommunity }) => {
      localStorage.setItem('sharecrops_token', token);
      localStorage.setItem('sharecrops_user', userJson);
      if (markCommunity) {
        sessionStorage.setItem('sharecrops_community_selected', 'true');
      }
    },
    { token: MOCK_TOKEN, userJson: JSON.stringify(user), markCommunity: communitySelected }
  );
}

/**
 * Drives the real login form with mocked credentials and waits until the auth screen is gone.
 * Assumes `installApiMocks` has already been called.
 */
export async function loginViaForm(
  page: Page,
  credentials: { email: string; password: string } = TEST_CREDENTIALS
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(credentials.email);
  await page.getByLabel('Password').fill(credentials.password);
  await page.getByRole('button', { name: 'Log In' }).click();
}
