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
					error: 'Vous ne pouvez pas vous ajouter vous-meme en ami';
				});
			}

			// Check if the target exist
			const targetUser = await userRepo.findById(friend_id);
			if (!targetUser) {
				return reply.status(400).send ({
					success:false,
					error: 'Utilisateur non trouve'
				});
			}

			// Check if they are already friend
			const existingFriendship = await db.get(`
				SELECT * FROM friendships
				WHERE	(user_id = ? AND friend_id = ?)
					OR	(user_id = ? AND friend_id = ?)
				`, [currentUser.id, friend_id, friend_id, currentUser.id])
		
		}
}