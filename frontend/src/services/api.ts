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

export interface LoginCreadentials {
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