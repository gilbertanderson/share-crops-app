import { projectId, publicAnonKey } from '/utils/supabase/info';

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

  static getUser(): any | null {
    const user = localStorage.getItem(this.USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  static setUser(user: any) {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  static isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

export class API {
  private static async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
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

    return data;
  }

  private static async uploadFile(endpoint: string, file: File): Promise<any> {
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

    return data;
  }

  // Auth
  static async signup(email: string, password: string, name: string) {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  static async login(email: string, password: string) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (data.accessToken) {
      AuthManager.setToken(data.accessToken);
    }

    return data;
  }

  static async getMe() {
    const data = await this.request('/auth/me');
    if (data.user) {
      AuthManager.setUser(data.user);
    }
    return data;
  }

  static async resetPassword(email: string) {
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

  // Communities
  static async createCommunity(name: string, zipCode: string) {
    return this.request('/communities', {
      method: 'POST',
      body: JSON.stringify({ name, zipCode }),
    });
  }

  static async joinCommunity(communityId: string) {
    return this.request('/communities/join', {
      method: 'POST',
      body: JSON.stringify({ communityId }),
    });
  }

  static async searchCommunities(zipCode: string) {
    return this.request(`/communities/search?zipCode=${zipCode}`);
  }

  static async getMyCommunity() {
    return this.request('/communities/my');
  }

  static async getMyCommunities() {
    return this.request('/communities/mine');
  }

  static async leaveCommunity(communityId: string) {
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
  }) {
    return this.request('/listings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async getListings(filters?: { communityId?: string; zipCode?: string }) {
    const params = new URLSearchParams(filters as any).toString();
    return this.request(`/listings${params ? `?${params}` : ''}`);
  }

  static async getListing(id: string) {
    return this.request(`/listings/${id}`);
  }

  static async deleteListing(id: string) {
    return this.request(`/listings/${id}`, {
      method: 'DELETE',
    });
  }

  static async getUserListings(userId: string) {
    return this.request(`/listings/user/${userId}`);
  }

  // Offers
  static async createOffer(listingId: string, offeredProduce: string, message?: string) {
    return this.request('/offers', {
      method: 'POST',
      body: JSON.stringify({ listingId, offeredProduce, message }),
    });
  }

  static async acceptOffer(offerId: string) {
    return this.request(`/offers/${offerId}/accept`, { method: 'POST' });
  }

  static async declineOffer(offerId: string) {
    return this.request(`/offers/${offerId}/decline`, { method: 'POST' });
  }

  static async completeOffer(offerId: string) {
    return this.request(`/offers/${offerId}/complete`, { method: 'POST' });
  }

  static async getMyOffers(as?: 'buyer' | 'seller') {
    return this.request(`/offers/my${as ? `?as=${as}` : ''}`);
  }

  // Chat
  static async createThread(listingId: string, otherUserId: string) {
    return this.request('/chat/threads', {
      method: 'POST',
      body: JSON.stringify({ listingId, otherUserId }),
    });
  }

  static async sendMessage(threadId: string, content: string) {
    return this.request('/chat/messages', {
      method: 'POST',
      body: JSON.stringify({ threadId, content }),
    });
  }

  static async getThreads() {
    return this.request('/chat/threads');
  }

  static async getMessages(threadId: string) {
    return this.request(`/chat/messages/${threadId}`);
  }

  // Ratings
  static async createRating(offerId: string, rating: number, comment?: string) {
    return this.request('/ratings', {
      method: 'POST',
      body: JSON.stringify({ offerId, rating, comment }),
    });
  }

  static async getUserRatings(userId: string) {
    return this.request(`/ratings/user/${userId}`);
  }

  // Profile
  static async updateProfile(data: {
    name?: string;
    bio?: string;
    socialUrl?: string;
    profilePhotoUrl?: string;
  }) {
    return this.request('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async getProfile(userId: string) {
    return this.request(`/profile/${userId}`);
  }

  // Upload
  static async uploadPhoto(file: File) {
    return this.uploadFile('/upload', file);
  }
}
