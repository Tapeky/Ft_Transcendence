import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService, User, LoginCredentials, RegisterCredentials } from '../services/api';

interface AuthContextType {
	user: User | null;
	loading: boolean;
	isAuthenticated: boolean;
	login: (credentials: LoginCredentials) => Promise<void>;
	register: (credentials: RegisterCredentials) => Promise<void>;
	logout: () => Promise<void>;
	refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
	children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {

	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const initAuth = async () => {
			try {
				const callbackToken = apiService.handleAuthCallback();
				if (callbackToken) {
					console.log('Token reçu depuis callback GitHub');
				}
			} catch (error) {
				console.error('Erreur callback GitHub:', error);
			}

			if (apiService.isAuthenticated()) {
				try {
					const currentUser = await apiService.getCurrentUser();
					setUser(currentUser);
					console.log('Token trouvé, récupération des infos utilisateur...');
				} catch (error) {
					console.error('Erreur lors de la récupération des infos utilisateur:', error);
					apiService.clearToken();
				}
			}
			setLoading(false);
		};

		const handleBeforeUnload = async () => {
			if (user) {
				const data = JSON.stringify({});
				const token = localStorage.getItem('auth_token');
				
				if (token) {
					navigator.sendBeacon(`https://localhost:8000/api/auth/logout`, data);
				}
			}
		};

		const handleVisibilityChange = async () => {
			if (document.hidden && user) {
				setTimeout(async () => {
					if (document.hidden) {
						try {
							await apiService.logout();
							setUser(null);
						} catch (error) {
							console.error('Erreur auto-logout:', error);
						}
					}
				}, 30000);
			}
		};

		let heartbeatInterval: NodeJS.Timeout | null = null;
		
		if (user) {
			heartbeatInterval = setInterval(async () => {
				try {
					await apiService.heartbeat();
				} catch (error) {
					console.error('Erreur heartbeat:', error);
					if (error instanceof Error && error.message.includes('401')) {
						apiService.clearToken();
						setUser(null);
					}
				}
			}, 60000);
		}

		initAuth();

		window.addEventListener('beforeunload', handleBeforeUnload);
		document.addEventListener('visibilitychange', handleVisibilityChange);

		return () => {
			window.removeEventListener('beforeunload', handleBeforeUnload);
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			if (heartbeatInterval) {
				clearInterval(heartbeatInterval);
			}
		};
	}, [user]);

	const login = async (credentials: LoginCredentials) => {
		setLoading(true);
		try {
			const authResponse = await apiService.login(credentials);
			setUser(authResponse.user);
		} catch (error) {
			console.error('Login failed:', error);
			throw error;
		} finally {
			setLoading(false);
		}
	};

	const register = async (credentials: RegisterCredentials) => {
		setLoading(true);
		try {
			const authResponse = await apiService.register(credentials);
			setUser(authResponse.user);
			console.log('Inscription réussie, utilisateur:', authResponse.user);
		} catch (error) {
			console.error('Erreur lors de l\'inscription:', error);
			throw error;
		} finally {
			setLoading(false);
		}
	};

	const logout = async () => {
		setLoading(true);
		try {
			await apiService.logout();
			setUser(null);
			console.log('Déconnexion réussie');
		} catch (error) {
			console.error('Erreur lors de la déconnexion:', error);
			setUser(null);
		} finally {
			setLoading(false);
		}
	};

	const refreshUser = async () => {
		try {
			const currentUser = await apiService.getCurrentUser();
			setUser(currentUser);
			console.log('Informations utilisateur mises à jour');
		} catch (error) {
			console.error('Erreur lors de la mise à jour des infos utilisateur:', error);
		}
	};
	
	const value: AuthContextType = {
		user,
		loading,
		isAuthenticated: !!user,
		login,
		register,
		logout,
		refreshUser,
	};

	return (
		<AuthContext.Provider value={value}>
			{children}
		</AuthContext.Provider>
	);

}

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined)
		throw new Error('useAuth must be used within an AuthProvider');
	return context;
};