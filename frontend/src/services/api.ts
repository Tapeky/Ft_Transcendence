const API_BASE_URL = 'http://localhost:8000';

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

export interface ApiResponse <T = any> {
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

class ApiService {
	private token: string | null = null;

	constructor () {
		this.token = localStorage.getItem('auth_token'); 
	}

	private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
		const url = `${API_BASE_URL}${endpoint}`;
		
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			...options.headers as Record<string, string>
		};

		if (this.token) {
			headers['Authorization'] = `Bearer ${this.token}`;
		}

		const config: RequestInit = {
			...options,
			headers,
		};

		try {
			const response = await fetch(url, config);
			const data = await response.json();
			if (!response.ok) {
				throw new Error(data.error || 'Une erreur est survenue');
			}
			return data;
		} catch (error) {
			console.error('Erreur API:', error);
			throw error;
		}

	}

	async login(credentials: LoginCredentials): Promise<AuthResponse> {
		const response = await this.request<AuthResponse>('/api/auth/login', {
			method: 'POST',
			body: JSON.stringify(credentials),
		});
		if (response.data?.token) { // si response.data existe ET contient un token
			this.setToken(response.data.token);
		}
		return response.data!;	
	}

	async register(credentials: RegisterCredentials): Promise<AuthResponse> {
		const response = await this .request<AuthResponse>('/api/auth/register', {
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

	isAuthenticated(): boolean {
		return !!this.token;
	}

	async logout(): Promise<void> {
		try {
			await this.request('/api/auth/logout', { 
				method: 'POST' 
			});
		} catch (error) {
			console.error('Logout backend error:', error);
		} finally {
			this.clearToken();
		}
	}

	async getCurrentUser(): Promise<User> {
		const response = await this.request<User>('/api/auth/me');
		return response.data!;
	}

	// GitHub OAuth
	getGitHubAuthUrl(): string {
		return `${API_BASE_URL}/api/auth/github`;
	}

	// Gestion du token depuis l'URL (callback GitHub)
	handleAuthCallback(): string | null {
		const urlParams = new URLSearchParams(window.location.search);
		const token = urlParams.get('token');
		const error = urlParams.get('error');

		if (token) {
			this.setToken(token);
			// Nettoyer l'URL
			window.history.replaceState({}, document.title, window.location.pathname);
			return token;
		}

		if (error) {
			console.error('Erreur auth callback:', error);
			// Nettoyer l'URL
			window.history.replaceState({}, document.title, window.location.pathname);
			throw new Error('Erreur lors de l\'authentification GitHub');
		}

		return null;
	}

}

export const apiService = new ApiService();