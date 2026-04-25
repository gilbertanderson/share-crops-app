import { projectId, publicAnonKey } from '../../utils/supabase/info';
import type { User, Listing, Offer, Thread, Message, Rating, Community } from '../types';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-dd877831`;

export class AuthManager {
  private static TOKEN_KEY = 'sharecrops_token';
  private static USER_KEY = 'sharecrops_user';

  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static setToken(token: string) {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  static clearToken() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  static getUser(): User | null {
    const user = localStorage.getItem(this.USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  static setUser(user: User) {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  static isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

export class API {
  private static async request<T = unknown>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = AuthManager.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || publicAnonKey}`,
      ...options.headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data as T;
  }

  private static async uploadFile(endpoint: string, file: File): Promise<{ url: string }> {
    const token = AuthManager.getToken();
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token || publicAnonKey}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }

    return data as { url: string };
  }

  // Auth
  static async signup(email: string, password: string, name: string): Promise<{ user: User; accessToken: string }> {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  static async login(email: string, password: string): Promise<{ user: User; accessToken: string }> {
    const data = await this.request<{ user: User; accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (data.accessToken) {
      AuthManager.setToken(data.accessToken);
    }

    return data;
  }

  static async getMe(): Promise<{ user: User }> {
    const data = await this.request<{ user: User }>('/auth/me');
    if (data.user) {
      AuthManager.setUser(data.user);
    }
    return data;
  }

  static async resetPassword(email: string): Promise<{ success: boolean }> {
    const supabaseUrl = `https://${projectId}.supabase.co`;
    const response = await fetch(`${supabaseUrl}/auth/v1/recover`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': publicAnonKey,
      },
      body: JSON.stringify({
        email,
        redirect_to: `${window.location.origin}/reset-password`,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error_description || data.msg || 'Password reset failed');
    }

    return { success: true };
  }

  static async updatePasswordWithToken(accessToken: string, newPassword: string): Promise<{ success: boolean }> {
    const supabaseUrl = `https://${projectId}.supabase.co`;
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'apikey': publicAnonKey,
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ password: newPassword }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error_description || data.msg || 'Failed to update password');
    }

    return { success: true };
  }

  // Communities
  static async createCommunity(name: string, zipCode: string): Promise<{ community: Community }> {
    return this.request('/communities', {
      method: 'POST',
      body: JSON.stringify({ name, zipCode }),
    });
  }

  static async joinCommunity(communityId: string): Promise<{ community: Community }> {
    return this.request('/communities/join', {
      method: 'POST',
      body: JSON.stringify({ communityId }),
    });
  }

  static async searchCommunities(zipCode: string): Promise<{ communities: Community[] }> {
    return this.request(`/communities/search?zipCode=${zipCode}`);
  }

  static async getMyCommunity(): Promise<{ community: Community | null }> {
    return this.request('/communities/my');
  }

  static async getMyCommunities(): Promise<{ communities: Community[]; activeCommunityId: string | null }> {
    return this.request('/communities/mine');
  }

  static async leaveCommunity(communityId: string): Promise<{ success: boolean }> {
    return this.request(`/communities/mine/${communityId}`, {
      method: 'DELETE',
    });
  }

  // Listings
  static async createListing(data: {
    title: string;
    description: string;
    quantity: string;
    photos: string[];
    lookingFor?: string;
    expiresInDays: number;
  }): Promise<{ listing: Listing }> {
    return this.request('/listings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async getListings(filters?: { communityId?: string; zipCode?: string }): Promise<{ listings: Listing[] }> {
    const params = filters ? new URLSearchParams(filters as Record<string, string>).toString() : '';
    return this.request(`/listings${params ? `?${params}` : ''}`);
  }

  static async getListing(id: string): Promise<{ listing: Listing }> {
    return this.request(`/listings/${id}`);
  }

  static async deleteListing(id: string): Promise<{ success: boolean }> {
    return this.request(`/listings/${id}`, {
      method: 'DELETE',
    });
  }

  static async getUserListings(userId: string): Promise<{ listings: Listing[] }> {
    return this.request(`/listings/user/${userId}`);
  }

  // Offers
  static async createOffer(listingId: string, offeredProduce: string, message?: string): Promise<{ offer: Offer }> {
    return this.request('/offers', {
      method: 'POST',
      body: JSON.stringify({ listingId, offeredProduce, message }),
    });
  }

  static async acceptOffer(offerId: string): Promise<{ offer: Offer }> {
    return this.request(`/offers/${offerId}/accept`, { method: 'POST' });
  }

  static async declineOffer(offerId: string): Promise<{ offer: Offer }> {
    return this.request(`/offers/${offerId}/decline`, { method: 'POST' });
  }

  static async completeOffer(offerId: string): Promise<{ offer: Offer }> {
    return this.request(`/offers/${offerId}/complete`, { method: 'POST' });
  }

  static async getMyOffers(as?: 'buyer' | 'seller'): Promise<{ offers: Offer[] }> {
    return this.request(`/offers/my${as ? `?as=${as}` : ''}`);
  }

  // Chat
  static async createThread(listingId: string, otherUserId: string): Promise<{ thread: Thread }> {
    return this.request('/chat/threads', {
      method: 'POST',
      body: JSON.stringify({ listingId, otherUserId }),
    });
  }

  static async sendMessage(threadId: string, content: string): Promise<{ message: Message }> {
    return this.request('/chat/messages', {
      method: 'POST',
      body: JSON.stringify({ threadId, content }),
    });
  }

  static async getThreads(): Promise<{ threads: Thread[] }> {
    return this.request('/chat/threads');
  }

  static async getMessages(threadId: string): Promise<{ messages: Message[] }> {
    return this.request(`/chat/messages/${threadId}`);
  }

  // Ratings
  static async createRating(offerId: string, rating: number, comment?: string): Promise<{ rating: Rating }> {
    return this.request('/ratings', {
      method: 'POST',
      body: JSON.stringify({ offerId, rating, comment }),
    });
  }

  static async getUserRatings(userId: string): Promise<{ ratings: Rating[] }> {
    return this.request(`/ratings/user/${userId}`);
  }

  // Profile
  static async updateProfile(data: {
    name?: string;
    bio?: string;
    socialUrl?: string;
    profilePhotoUrl?: string;
  }): Promise<{ user: User }> {
    return this.request('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async getProfile(userId: string): Promise<{ profile: User }> {
    return this.request(`/profile/${userId}`);
  }

  // Trending
  static async getTrendingByZip(zipCode: string): Promise<{ items: Array<{ listing: Listing; offerCount: number }> }> {
    return this.request(`/trending/zip/${encodeURIComponent(zipCode)}`);
  }

  // Upload
  static async uploadPhoto(file: File): Promise<{ url: string }> {
    return this.uploadFile('/upload', file);
  }
}
