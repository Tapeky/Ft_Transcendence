import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { DatabaseManager } from "../database/DatabaseManager";
import { UserRepository } from "../repositories/UserRepository";
import { authenticateToken, validateInput } from "../middleware";


export async function friendRoute(server : FastifyInstance) {
	const db = DatabaseManager.getInstance().getDb();
	const userRepo = new UserRepository(db);

	// POST /api/friends/request - Envoyer une demande d'ami
	server.post('/request', {
		preHandler: [
			authenticateToken,
			validateInput({
				body: {
					friend_id: { required: true, type: 'number' }
				}
			})
		]
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const currentUser = request.user as { id:number; username:string; email:string };
			const { friend_id } = request.body as { friend_id:number };
		
			// Handle Self Adding
			if (currentUser.id === friend_id) {
				return reply.status(400).send ({
					success: false,
					error: 'Vous ne pouvez pas vous ajouter vous-meme en ami'
				});
			}

			// Check if the target exist
			const targetUser = await userRepo.findById(friend_id);
			if (!targetUser) {
				return reply.status(404).send ({
					success:false,
					error: 'Utilisateur non trouve'
				});
			}

			// Check if they are already friend
			const existingFriendship = await db.get(`
				SELECT * FROM friendships
				WHERE	(user_id = ? AND friend_id = ?)
					OR	(user_id = ? AND friend_id = ?)
				`, [currentUser.id, friend_id, friend_id, currentUser.id]);
			
			if (existingFriendship) {
				if (existingFriendship.status === 'pending') {
					return reply.status(409).send ({
						success:false,
						error: 'Une demande d ami est deja en attente'
					});
				} else if (existingFriendship.status === 'accepted') {
					return reply.status(409).send ({
						success:false,
						error: 'Vous etes deja amis'
					});
				} else if (existingFriendship.status === 'blocked') {
					return reply.status(409).send ({
						success:false,
						error: 'Impossible d envoyer une demande d ami'
					});
				}
			}
		

			// Cree une demande d ami
			const result = await db.run(`
				INSERT INTO friendships (user_id, friend_id, status)
				VALUES (?, ?, 'pending')
				`, [currentUser.id, friend_id]);
			
			// Log
			await userRepo.logSecurityAction({
				user_id: currentUser.id,
				action: 'FRIEND_REQUEST_SENT',
				ip_address: request.ip,
				user_agent: request.headers['user-agent'],
				success:true,
				details: JSON.stringify({ target_user_id: friend_id, target_username: targetUser.username})
			});

			reply.send({
				success:true,
				message: 'Demande d amis envoye avec succes',
				data: {
					id: result.lastID,
					friend_id,
					status: 'pending'
				}
			});
		} catch (error: any) {
			request.log.error('Erreur inatendue lors de l envoi de la demande d ami:', error);
			reply.status(500).send({
				success: false,
				error: 'Erreur lors de l envoi de la demande d ami'
			});
		}
	});
}