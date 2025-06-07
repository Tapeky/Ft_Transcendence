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

export interface ApiResponses <T = any> {
	success: boolean;
	data?: T;
	message?: string;
	error?: string;
}

export interface LoginCredentials {
	username: string;
	password: string;
}

export interface RegisterCredentials {
	username: string;
	password: string;
	email: string;
	display_name?: string;
	data_consent: boolean;
}

class ApiService {
	private token: string | null = null;

	constructor () {
		this.token = localStorage.getItem('auth_token'); 
	}

	private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
		// TODO: Implémenter la logique de requête API
	}

	async login(credentials: LoginCredentials): Promise<AuthResponse> {
		// TODO: Implémenter la logique de connexion
	}

	async register(credentials: RegisterCredentials): Promise<AuthResponse> {
		// TODO: Implémenter la logique d'inscription
	}

	setToken(token: string): void {
	}

	clearToken(): void {
	}

	isAuthenticated(): boolean {
		return this.token !== null;
	}

}

export const apiService = new ApiService();