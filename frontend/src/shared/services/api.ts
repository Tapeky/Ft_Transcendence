const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'https://localhost:8000';

export interface User {
	id: number;
	username: string;
	email: string;
	display_name?: string;
	avatar_url?: string;
	is_online: boolean;
	total_wins: number;
	total_losses: number;
	total_games: number;
	created_at: string;
}

export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	message?: string;
	error?: string;
}

export interface LoginCredentials {
	email: string;
	password: string;
}

export interface RegisterCredentials {
	username: string;
	password: string;
	email: string;
	display_name?: string;
	data_consent: boolean;
}

export interface AuthResponse {
	user: User;
	token: string;
	expires_in: string;
}

export interface Avatar {
	id: string;
	name: string;
	url: string;
}

export interface Friend {
	id: number;
	username: string;
	display_name: string;
	avatar_url: string | null;
	is_online: boolean;
	total_wins: number;
	total_losses: number;
}

export interface FriendRequest {
	id: number;
	created_at: string;
	user_id: number;
	username: string;
	display_name: string;
	avatar_url: string | null;
	is_online: boolean;
}

export interface Match {
	id: number;
	player1_username: string;
	player2_username: string;
	player1_avatar_url?: string;
	player2_avatar_url?: string;
	player1_guest_name?: string;
	player2_guest_name?: string;
	player1_score: number;
	player2_score: number;
	winner_id?: number;
	game_type: string;
	created_at: string;
	status: string;
}

export interface MatchDetails extends Match {
	duration_seconds?: number;
	player1_touched_ball?: number;
	player1_missed_ball?: number;
	player2_touched_ball?: number;
	player2_missed_ball?: number;
	match_data?: string;
}

export interface LeaderboardEntry {
	id: number;
	username: string;
	display_name: string;
	avatar_url: string;
	total_wins: number;
	total_losses: number;
	win_rate: number;
}

class ApiService {
	private token: string | null = null;

	constructor() {
		this.token = localStorage.getItem('auth_token'); 
	}

	private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
		const url = `${API_BASE_URL}${endpoint}`;
		const headers: Record<string, string> = { ...options.headers as Record<string, string> };
		if (options.body && !(options.body instanceof FormData)) {
			headers['Content-Type'] = 'application/json';
		}
		if (this.token) {
			headers['Authorization'] = `Bearer ${this.token}`;
		}
		const config: RequestInit = { ...options, headers };
		try {
			const response = await fetch(url, config);
			const data = await response.json();
			if (!response.ok) {
				throw new Error(data.error || 'An error occurred');
			}
			return data;
		} catch (error) {
			if (error instanceof Error && !['taken', 'used', 'exists', 'invalid', 'incorrect'].some(word => error.message.includes(word))) {
				console.error('API error:', error.message);
			}
			throw error;
		}
	}

	async login(credentials: LoginCredentials): Promise<AuthResponse> {
		const response = await this.request<AuthResponse>('/api/auth/login', {
			method: 'POST',
			body: JSON.stringify(credentials),
		});
		if (response.data?.token) {
			this.setToken(response.data.token);
		}
		return response.data!;	
	}

	async register(credentials: RegisterCredentials): Promise<AuthResponse> {
		const response = await this.request<AuthResponse>('/api/auth/register', {
			method: 'POST',
			body: JSON.stringify(credentials),
		});
		if (response.data?.token) {
			this.setToken(response.data.token);
		}
		return response.data!;
	}

	setToken(token: string): void {
		this.token = token;
		localStorage.setItem('auth_token', token);
	}

	clearToken(): void {
		this.token = null;
		localStorage.removeItem('auth_token');
	}

	getToken(): string | null {
		return this.token;
	}

	isAuthenticated(): boolean {
		return !!this.token;
	}

	async logout(): Promise<void> {
		try {
			await this.request('/api/auth/logout', { 
				method: 'POST',
				body: JSON.stringify({})
			});
		} catch (error) {
			console.error('Logout error:', error instanceof Error ? error.message : String(error));
		} finally {
			this.clearToken();
		}
	}

	async getCurrentUser(): Promise<User> {
		const response = await this.request<User>('/api/auth/me');
		return response.data!;
	}

	getGitHubAuthUrl(): string {
		return `${API_BASE_URL}/api/auth/github`;
	}

	getGoogleAuthUrl(): string {
		return `${API_BASE_URL}/api/auth/google`;
	}

	handleAuthCallback(): string | null {
		const urlParams = new URLSearchParams(window.location.search);
		const token = urlParams.get('token');
		const error = urlParams.get('error');
		if (token) {
			this.setToken(token);
			window.history.replaceState({}, document.title, window.location.pathname);
			return token;
		}
		if (error) {
			console.error('Auth error:', error);
			window.history.replaceState({}, document.title, window.location.pathname);
			if (error === 'google_auth_failed') {
				throw new Error('Google auth failed');
			} else if (error === 'github_auth_failed') {
				throw new Error('GitHub auth failed');
			} else {
				throw new Error('Auth failed');
			}
		}
		return null;
	}

	private getWebSocketUrl(): string {
		const apiUrl = (import.meta as any).env?.VITE_API_URL || 'https://localhost:8000';
		const wsUrl = apiUrl.replace(/^https?:/, window.location.protocol === 'https:' ? 'wss:' : 'ws:');
		return `${wsUrl}/ws`;
	}
	
	connectWebSocket(): WebSocket {
		return new WebSocket(this.getWebSocketUrl());
	}

	async updateProfile(data: { display_name?: string; avatar_url?: string }): Promise<User> {
		const response = await this.request<User>('/api/auth/profile', {
			method: 'PUT',
			body: JSON.stringify(data),
		});
		return response.data!;
	}

	async changePassword(currentPassword: string, newPassword: string): Promise<void> {
		await this.request('/api/auth/password', {
			method: 'PUT',
			body: JSON.stringify({
				current_password: currentPassword,
				new_password: newPassword,
			}),
		});
	}

	async deleteAccount(password: string): Promise<void> {
		await this.request('/api/auth/account', {
			method: 'DELETE',
			body: JSON.stringify({
				password: password,
				confirm_deletion: true,
			}),
		});
	}

	async updateProfileDisplayName(displayName: string): Promise<{ display_name: string }> {
		const response = await this.request<{ display_name: string }>('/api/profile', {
			method: 'PATCH',
			body: JSON.stringify({ display_name: displayName }),
		});
		return response.data!;
	}

	async searchUsers(query: string, limit: number = 10): Promise<User[]> {
		const response = await this.request<User[]>(`/api/users/search?q=${encodeURIComponent(query)}&limit=${limit}`);
		return response.data!;
	}

	async getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
		const response = await this.request<LeaderboardEntry[]>(`/api/users/leaderboard?limit=${limit}`);
		return response.data!;
	}

	async getOnlineUsers(): Promise<User[]> {
		const response = await this.request<User[]>('/api/users/online');
		return response.data!;
	}

	async getUserById(id: number): Promise<User> {
		const response = await this.request<User>(`/api/users/${id}`);
		return response.data!;
	}

	async sendFriendRequest(friendId: number): Promise<{ id: number; friend_id: number; status: string }> {
		const response = await this.request<{ id: number; friend_id: number; status: string }>('/api/friends/request', {
			method: 'POST',
			body: JSON.stringify({ friend_id: friendId }),
		});
		return response.data!;
	}

	async acceptFriendRequest(id: number): Promise<void> {
		await this.request(`/api/friends/accept/${id}`, {
			method: 'PUT',
			body: JSON.stringify({}),
		});
	}

	async declineFriendRequest(id: number): Promise<void> {
		await this.request(`/api/friends/decline/${id}`, {
			method: 'PUT',
			body: JSON.stringify({}),
		});
	}

	async removeFriend(id: number): Promise<void> {
		await this.request(`/api/friends/${id}`, {
			method: 'DELETE',
		});
	}

	async getFriends(): Promise<Friend[]> {
		const response = await this.request<Friend[]>('/api/friends');
		return response.data!;
	}

	async getFriendRequests(): Promise<FriendRequest[]> {
		const response = await this.request<FriendRequest[]>('/api/friends/requests');
		return response.data!;
	}

	async getSentFriendRequests(): Promise<FriendRequest[]> {
		const response = await this.request<FriendRequest[]>('/api/friends/sent');
		return response.data!;
	}

	async getBlockedUsers(): Promise<User[]> {
		const response = await this.request<User[]>('/api/friends/blocked');
		return response.data!;
	}

	async blockUser(id: number): Promise<void> {
		await this.request(`/api/friends/block/${id}`, {
			method: 'PUT'
		});
	}

	async unblockUser(id: number): Promise<void> {
		await this.request(`/api/friends/unblock/${id}`, {
			method: 'PUT'
		});
	}

	async getAvatars(): Promise<Avatar[]> {
		const response = await this.request<Avatar[]>('/api/avatars');
		return response.data!;
	}

	async setAvatar(avatarId: string): Promise<{ avatar_id: string; avatar_url: string }> {
		const response = await this.request<{ avatar_id: string; avatar_url: string }>('/api/avatars/set', {
			method: 'PUT',
			body: JSON.stringify({ avatar_id: avatarId }),
		});
		return response.data!;
	}

	async uploadAvatar(file: File): Promise<{ avatar_url: string; filename: string }> {
		const formData = new FormData();
		formData.append('file', file);
		const response = await this.request<{ avatar_url: string; filename: string }>('/api/avatars/upload', {
			method: 'POST',
			body: formData
		});
		return response.data!;
	}

	async recordMatch(data: {
		player1_id?: number;
		player2_id?: number;
		player1_guest_name?: string;
		player2_guest_name?: string;
		player1_score: number;
		player2_score: number;
		winner_id?: number;
		game_type?: string;
		max_score?: number;
		duration_seconds?: number;
		player1_touched_ball?: number;
		player1_missed_ball?: number;
		player2_touched_ball?: number;
		player2_missed_ball?: number;
		match_data?: string;
	}): Promise<Match> {
		const response = await this.request<Match>('/api/matches/record', {
			method: 'POST',
			body: JSON.stringify(data),
		});
		return response.data!;
	}

	async getMatches(params?: {
		player_id?: number;
		game_type?: string;
		limit?: number;
		offset?: number;
		include_guests?: boolean;
		include_stats?: boolean;
	}): Promise<{ data: Match[]; pagination: { limit: number; offset: number; total: number } }> {
		const searchParams = new URLSearchParams();
		if (params?.player_id) searchParams.append('player_id', params.player_id.toString());
		if (params?.game_type) searchParams.append('game_type', params.game_type);
		if (params?.limit) searchParams.append('limit', params.limit.toString());
		if (params?.offset) searchParams.append('offset', params.offset.toString());
		if (params?.include_guests) searchParams.append('include_guests', params.include_guests.toString());
		if (params?.include_stats) searchParams.append('include_stats', params.include_stats.toString());
		const response = await this.request<{ data: Match[]; pagination: { limit: number; offset: number; total: number } }>(`/api/matches${searchParams.toString() ? '?' + searchParams.toString() : ''}`);
		return response.data!;
	}

	async createMatch(data: { player2_id: number; game_type?: string; max_score?: number }): Promise<Match> {
		const response = await this.request<Match>('/api/matches', {
			method: 'POST',
			body: JSON.stringify(data),
		});
		return response.data!;
	}

	async getLiveMatches(): Promise<{ data: Match[]; count: number }> {
		const response = await this.request<{ data: Match[]; count: number }>('/api/matches/live');
		return response.data!;
	}

	async getMatchById(id: number): Promise<MatchDetails> {
		const response = await this.request<MatchDetails>(`/api/matches/${id}`);
		return response.data!;
	}

	async recordMatchResult(id: number, data: {
		player1_score: number;
		player2_score: number;
		winner_id: number;
	}): Promise<Match> {
		const response = await this.request<Match>(`/api/matches/${id}/result`, {
			method: 'PUT',
			body: JSON.stringify(data),
		});
		return response.data!;
	}

	async startMatch(id: number): Promise<void> {
		await this.request(`/api/matches/${id}/start`, {
			method: 'POST',
		});
	}

	async getHealthStatus(): Promise<{
		status: string;
		timestamp: string;
		environment: string;
		database: any;
		uptime: number;
	}> {
		const response = await this.request<{
			status: string;
			timestamp: string;
			environment: string;
			database: any;
			uptime: number;
		}>('/health');
		return response.data!;
	}

	async getApiInfo(): Promise<{
		name: string;
		version: string;
		environment: string;
		timestamp: string;
		endpoints: any;
	}> {
		const response = await this.request<{
			name: string;
			version: string;
			environment: string;
			timestamp: string;
			endpoints: any;
		}>('/');
		return response.data!;
	}

	async heartbeat(): Promise<void> {
		await this.request('/api/auth/heartbeat', {
			method: 'POST',
			body: JSON.stringify({})
		});
	}

	async sendGameInvite(receiverId: number): Promise<void> {
		await this.request('/api/game-invites/send', {
			method: 'POST',
			body: JSON.stringify({ receiverId })
		});
	}

	async respondToGameInvite(inviteId: number, action: 'accept' | 'decline'): Promise<void> {
		await this.request(`/api/game-invites/${inviteId}/respond`, {
			method: 'POST',
			body: JSON.stringify({ action })
		});
	}

	async getReceivedGameInvites(): Promise<any[]> {
		const response = await this.request<{ invites: any[] }>('/api/game-invites/pending');
		return response.data?.invites || [];
	}

	async get<T>(endpoint: string): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, { method: 'GET' });
	}

	async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, {
			method: 'POST',
			body: data ? JSON.stringify(data) : undefined
		});
	}

	async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, {
			method: 'PUT',
			body: data ? JSON.stringify(data) : undefined
		});
	}

	async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, { method: 'DELETE' });
	}
}

export const apiService = new ApiService();
export const api = apiService;
