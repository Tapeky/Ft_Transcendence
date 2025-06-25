import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateToken, validateInput } from '../middleware';
import { DatabaseManager } from '../database/DatabaseManager';
import { UserRepository } from '../repositories/UserRepository';

export async function avatarsRoutes(fastify: FastifyInstance) {
	const db = DatabaseManager.getInstance().getDb();
	const userRepo = new UserRepository(db);
	// GET /api/avatars - Liste des avatars disponibles
	fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			// Dicebear API sert a generer des avatars
			const avatars = [
				{
					id: 'default',
					name: 'default',
					url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default&backgroundColor=b6e3f4'
				},
				{
					id: 'avatar-1',
					name: 'Avatar Style 1',
					url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=gaming1&backgroundColor=c0aede'
				},
				{
					id: 'avatar-2', 
					name: 'Avatar Style 2',
					url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=gaming2&backgroundColor=d1d4f9'
				},
				{
					id: 'avatar-3',
					name: 'Avatar Style 3',
					url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=gaming3&backgroundColor=fecaca'
				}
			];

			reply.send({
				success: true,
				data: avatars,
				message: 'liste des avatars récupérée avec succès'
			});

		} catch (error: any) {
			request.log.error('Error fetching avatars:', error);
			reply.status(500).send({
				success: false,
				error: 'Internal Server Error'
			});
		}
	});

	// PUT /api/avatars/set - Changer l'avatar de l'utilisateur
	fastify.put('/set', {
		preHandler: [
			authenticateToken,
			validateInput({
				body: {
					avatar_id: { required: true, type: 'string' }
				}
			})
		]
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const currentUser = request.user as { id: number; username: string; email: string };
			const { avatar_id } = request.body as { avatar_id: string };

			// Liste des avatars valides
			const validAvatars = ['default', 'avatar-1', 'avatar-2', 'avatar-3'];
			
			if (!validAvatars.includes(avatar_id)) {
				return reply.status(400).send({
					success: false,
					error: 'Avatar invalide'
				});
			}

			// Générer l'URL de l'avatar sélectionné
			const avatarUrls: Record<string, string> = {
				'default': 'https://api.dicebear.com/7.x/avataaars/svg?seed=default&backgroundColor=b6e3f4',
				'avatar-1': 'https://api.dicebear.com/7.x/avataaars/svg?seed=gaming1&backgroundColor=c0aede',
				'avatar-2': 'https://api.dicebear.com/7.x/avataaars/svg?seed=gaming2&backgroundColor=d1d4f9',
				'avatar-3': 'https://api.dicebear.com/7.x/avataaars/svg?seed=gaming3&backgroundColor=fecaca'
			};

			// Mettre à jour en base de données
			await userRepo.updateProfile(currentUser.id, { avatar_url: avatarUrls[avatar_id] });

			reply.send({
				success: true,
				message: 'Avatar mis a jour avec succes',
				data: {
					avatar_id,
					avatar_url: avatarUrls[avatar_id]
				}
			});

		} catch (error: any) {
			request.log.error('Error updating avatar:', error);
			reply.status(500).send({
				success: false,
				error: 'Internal Server Error'
			});
		}
	});
}