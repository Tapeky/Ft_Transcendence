import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService, User, LoginCredentials, RegisterCredentials } from '../services/api';

interface AuthContextType {
	user: User | null;
	loading: boolean;
	isAuthenticated: boolean;
	login: (credentials: LoginCredentials) => Promise<void>;
	register: (credentials: RegisterCredentials) => Promise<void>;
	logout: () => Promise<void>;
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
			if (apiService.isAuthenticated()) {
				try {
					const currentUser = await apiService.getCurrentUser();
					setUser(currentUser);
					console.log('Token trouve, recuperation des infos utilisateur...');
				} catch (error) {
					console.error('Erreur lors de la récupération des infos utilisateur:', error);
					apiService.clearToken();
				}
			}
			setLoading(false);
		};
		initAuth();
	}, []);

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
	
	const value: AuthContextType = {
		user,
		loading,
		isAuthenticated: !!user,
		login,
		register,
		logout,
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