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
				if (error instanceof Error) {
					console.error('Erreur callback GitHub:', error.message);
				} else {
					console.error('Erreur callback GitHub:', String(error));
				}
			}

			if (apiService.isAuthenticated()) {
				try {
					const currentUser = await apiService.getCurrentUser();
					setUser(currentUser);
					console.log('Token trouvé, récupération des infos utilisateur...');
				} catch (error) {
					if (error instanceof Error) {
						console.error('Erreur lors de la récupération des infos utilisateur:', error.message);
					} else {
						console.error('Erreur lors de la récupération des infos utilisateur:', String(error));
					}
					apiService.clearToken();
				}
			}
			setLoading(false);
		};

		initAuth();
	}, []);

	useEffect(() => {
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
							if (error instanceof Error) {
								console.error('Erreur auto-logout:', error.message);
							} else {
								console.error('Erreur auto-logout:', String(error));
							}
						}
					}
				}, 5 * 60 * 1000);
			}
		};

		let heartbeatInterval: NodeJS.Timeout | null = null;
		
		if (user) {
			heartbeatInterval = setInterval(async () => {
				try {
					await apiService.heartbeat();
				} catch (error) {
					if (error instanceof Error) {
						console.error('Erreur heartbeat:', error.message);
					} else {
						console.error('Erreur heartbeat:', String(error));
					}
					if (error instanceof Error && error.message.includes('401')) {
						apiService.clearToken();
						setUser(null);
					}
				}
			}, 60000);
		}

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
			if (error instanceof Error) {
				console.error('Login failed:', error.message);
			} else {
				console.error('Login failed:', String(error));
			}
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
			// Don't log expected validation errors - they're handled by the UI
			const isValidationError = error instanceof Error && (
				error.message.includes('déjà pris') || 
				error.message.includes('déjà utilisé') || 
				error.message.includes('existe déjà') ||
				error.message.includes('invalide') ||
				error.message.includes('incorrect')
			);
			
			if (!isValidationError) {
				if (error instanceof Error) {
					console.error('Erreur lors de l\'inscription:', error.message);
				} else {
					console.error('Erreur lors de l\'inscription:', String(error));
				}
			}
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
			if (error instanceof Error) {
				console.error('Erreur lors de la déconnexion:', error.message);
			} else {
				console.error('Erreur lors de la déconnexion:', String(error));
			}
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
			if (error instanceof Error) {
				console.error('Erreur lors de la mise à jour des infos utilisateur:', error.message);
			} else {
				console.error('Erreur lors de la mise à jour des infos utilisateur:', String(error));
			}
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