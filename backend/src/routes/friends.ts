import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { DatabaseManager } from "../database/DatabaseManager";
import { UserRepository } from "../repositories/UserRepository";
import { authenticateToken, validateInput } from "../middleware";


export async function friendRoutes(server : FastifyInstance) {
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

	// PUT /api/friends/accept/:id - Accepter une demande d'ami 
	server.put('/accept/:id', { 
		preHandler: [
			authenticateToken,
			validateInput({
				params: {
					id : { required:true, type: 'number' }
				}
			})
		]
	}, async (request: FastifyRequest, reply: FastifyReply) => { 
		try {
			const currentUser = request.user as {id:number; username:string; email:string };
			const {id} = request.params as { id:number };

			// Trouve la demande d ami
			const friendship = await db.get(`
				SELECT * FROM friendships
				WHERE id = ? AND friend_id = ? AND status = 'pending'
				`, [id, currentUser.id]);
			
			if (!friendship) {
				return reply.status(404).send ({
					success:false,
					error: 'Demande d ami non trouvee ou deja traitee'
				});
			}

			// Accepter la demande
			await db.run(`
				UPDATE friendships
				SET status = 'accepted'
				WHERE id = ?
				`, [id]);
		
			// Amitie bidirectionnelle
			await db.run(`
				INSERT INTO friendships (user_id, friend_id, status)
				VALUES (?, ?, 'accepted')
				`, [currentUser.id, friendship.user_id]);
		
			// Log
			await userRepo.logSecurityAction({
				user_id: currentUser.id,
				action: 'FRIEND_REQUEST_ACCEPTED',
				ip_address: request.ip,
				user_agent: request.headers['user-agent'],
				success: true,
				details: JSON.stringify({ friendship_id: id, requester_id: friendship.user_id })
			});

			reply.send({
				success: true,
				message: 'Demande d ami accepte avec succes'
			});
		
		} catch (error: any) {
			request.log.error('Erreur lors de l\'acceptation de la demande d\'ami:', error);
			reply.status(500).send({
				success: false,
				error: 'Erreur lors de l\'acceptation de la demande d\'ami'
			});
		}
	});

	// PUT /api/friends/decline/:id - Refueser une demande d'ami
	server.put('/decline/:id', {
		preHandler: [
			authenticateToken,
			validateInput({
				params: {
					id: { required: true, type: 'number'}
				}
			})
		]
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const currentUser = request.user as {id: number; username: string, email: string};
			const { id } = request.params as {id : number};

			// Trouver la demande d'ami
			const friendship = await db.get (`
				SELECT * FROM friendships
				WHERE id = ? AND friend_id = ? AND status = 'pending'
				`, [id, currentUser.id]);

			if (!friendship) {
				return reply.status(404).send ({
					success: false,
					error: 'La demande d ami n existe pas OU est deja traiteee'
				});
			}

			// Supprimer la demande
			await db.run (`DELETE FROM friendships WHERE id = ?`, [id]);

			// Log
			await userRepo.logSecurityAction({
				user_id: currentUser.id,
				action: 'FRIEND_REQUEST_DECLINED',
				ip_address: request.ip,
				user_agent: request.headers['user-agent'],
				success: true,
				details: JSON.stringify({ friendship_id: id, requester_id: friendship.user_id })
			});

			reply.send({
				success: true,
				message: 'Demande d ami refusee avec succes'
			});

		} catch (error: any) {
			request.log.error('Erreur lors du refus de la demande d\'ami:', error);
			reply.status(500).send({
				success: false,
				error: 'Erreur lors du refus de la demande d\'ami'
			});
		}
	});

	// DELETE /api/friends/remove/:id - Supprimer un ami
	server.delete('/:id', {
		preHandler: [
			authenticateToken,
			validateInput({
				params: {
					id: { required: true, type: 'number' }
				}
			})
		]
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const currentUser = request.user as { id: number; username: string; email: string };
			const { id } = request.params as { id: number };

			// Supprimer les deux relations d'amitié
			const result = await db.run(`
				DELETE FROM friendships
				WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
				`, [currentUser.id, id, id, currentUser.id]);
			if (result.changes === 0) {
				return reply.status(404).send({
					success: false,
					error: 'Amitié non trouvée'
				});
			}

			// Log
			await userRepo.logSecurityAction({
				user_id: currentUser.id,
				action: 'FRIEND_REMOVED',
				ip_address: request.ip,
				user_agent: request.headers['user-agent'],
				success: true,
				details: JSON.stringify({ removed_friend_id: id })
			});

			reply.send({
				success: true,
				message: 'Ami supprimé avec succès'
			});
		
		} catch (error: any) {
			request.log.error('Erreur lors de la suppression de l ami:', error);
			reply.status(500).send({
				success: false,
				error: 'Erreur lors de la suppression de l ami'
			});
		}
	});

	// GET /api/friends/list - Liste d'amis
	server.get('/', {
		preHandler: authenticateToken
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const currentUser = request.user as { id: number; username: string; email: string };
			const friends = await db.all(`
				SELECT u.id, u.username, u.display_name, u.avatar_url, u.is_online,
					u.total_wins, u.total_losses, u.created_at
				FROM friendships f
				JOIN users u ON f.friend_id = u.id
				WHERE f.user_id = ? AND f.status = 'accepted'
				`, [currentUser.id]);
				
			reply.send({
				success: true,
				data: friends,
				message: 'Liste d amis recuperer avec succes'
			});
			
		} catch (error: any) {
			request.log.error('Erreur lors de la recuperation de la liste d amis:', error);
			reply.status(500).send({
				success: false,
				error: 'Erreur lors de la recuperation de la liste d amis'
			});
		}
	});

	// GET /api/friends/requests - Liste des demandes d'amis recues
	server.get('/requests', {
		preHandler: authenticateToken
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const currentUser = request.user as { id: number; username: string; email: string };
			const requests = await db.all(`
				SELECT f.id, f.created_at,
					u.id as user_id, u.username, u.display_name, u.avatar_url, u.is_online
				FROM friendships f
				JOIN users u ON f.user_id = u.id
				WHERE f.friend_id = ? AND f.status = 'pending'
				ORDER BY f.created_at DESC
				`, [currentUser.id]);

			reply.send({
				success: true,
				data: requests,
				message: 'Demandes d amis recues recuperer avec succes'
			});

		} catch (error: any) {
			request.log.error('Erreur lors de la recuperation des demandes d amis recues:', error);
			reply.status(500).send({
				success: false,
				error: 'Erreur lors de la recuperation des demandes d amis recues'
			});
		}
	});

	// GET /api/friends/sent - Liste des demandes d'amis envoyees
	server.get('/sent', {
		preHandler: authenticateToken
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const currentUser = request.user as { id: number; username: string; email: string };
			const sentRequests = await db.all(`
				SELECT f.id, f.created_at,
					u.id as friend_id, u.username, u.display_name, u.avatar_url, u.is_online
				FROM friendships f
				JOIN users u ON f.friend_id = u.id
				WHERE f.user_id = ? AND f.status = 'pending'
				ORDER BY f.created_at DESC
				`, [currentUser.id]);

			reply.send({
				success: true,
				data: sentRequests,
				message: 'Demandes d amis envoye recuperer avec succes'
			});

		} catch (error: any) {
			request.log.error('Erreur lors de la recuperation des demandes d amis envoyees:', error);
			reply.status(500).send({
				success: false,
				error: 'Erreur lors de la recuperation des demandes d amis envoyees'
			});
		}
	});

	// GET /api/friends/blocked - Liste des utilisateurs bloqués
	server.get('/blocked', {
		preHandler: authenticateToken
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const currentUser = request.user as { id: number; username: string; email: string };
			const blockedUsers = await db.all(`
				SELECT u.id, u.username, u.display_name, u.avatar_url, f.created_at
				FROM friendships f
				JOIN users u ON f.friend_id = u.id
				WHERE f.user_id = ? AND f.status = 'blocked'
				ORDER BY f.created_at DESC
				`, [currentUser.id]);

			reply.send({
				success: true,
				data: blockedUsers,
				message: 'Liste des utilisateurs bloqués récupérée avec succès'
			});

		} catch (error: any) {
			request.log.error('Erreur lors de la récupération des utilisateurs bloqués:', error);
			reply.status(500).send({
				success: false,
				error: 'Erreur lors de la récupération des utilisateurs bloqués'
			});
		}
	});

	// PUT /api/friends/block/:id - Bloquer un utilisateur
	server.put('/block/:id', {
		preHandler: [
			authenticateToken,
			validateInput({
				params: {
					id: { required: true, type: 'number' }
				}
			})
		]
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const currentUser = request.user as { id: number; username: string; email: string };
			const { id } = request.params as { id: number };

			// ne pas bloquer soi-meme
			if (currentUser.id === id) {
				return reply.status(400).send({
					success: false,
					error: 'Vous ne pouvez pas vous bloquer vous-meme'
				});
			}

			// Vérifier que l'utilisateur cible existe
			const targetUser = await userRepo.findById(id);
			if (!targetUser) {
				return reply.status(404).send({
					success: false,
					error: 'Utilisateur non trouvé'
				});
			}

			// Supprimer toutes les relations d'amitié existantes
			await db.run(`
				DELETE FROM friendships
				WHERE (user_id = ? AND friend_id = ?)
					OR (user_id = ? AND friend_id = ?)
				`, [currentUser.id, id, id, currentUser.id]);

			// Bloquer l'utilisateur
			await db.run(`
				INSERT INTO friendships (user_id, friend_id, status)
				VALUES (?, ?, 'blocked')
				ON CONFLICT(user_id, friend_id) DO UPDATE SET status = 'blocked'
				`, [currentUser.id, id]);

			// Log
			await userRepo.logSecurityAction({
				user_id: currentUser.id,
				action: 'USER_BLOCKED',
				ip_address: request.ip,
				user_agent: request.headers['user-agent'],
				success: true,
				details: JSON.stringify({ blocked_user_id: id })
			});

			reply.send({
				success: true,
				message: 'Utilisateur bloque avec succes',
			});

		} catch (error: any) {
			request.log.error('Erreur lors du blocage de l utilisateur:', error);
			reply.status(500).send({
				success: false,
				error: 'Erreur lors du blocage de l utilisateur'
			});
		}
	});

	// PUT /api/friends/unblock/:id - Debloquer un utilisateur
	server.put('/unblock/:id', {
		preHandler: [
			authenticateToken,
			validateInput({
				params: {
					id: { required: true, type: 'number' }
				}
			})
		]
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const currentUser = request.user as { id: number; username: string; email: string };
			const { id } = request.params as { id: number };

			// ne pas debloquer soi-meme
			if (currentUser.id === id) {
				return reply.status(400).send({
					success: false,
					error: 'Vous ne pouvez pas vous debloquer vous-meme'
				});
			}

			// Debloquer l'utilisateur
			const result = await db.run(`
				DELETE FROM friendships
				WHERE user_id = ? AND friend_id = ? AND status = 'blocked'
				`, [currentUser.id, id]);

			if (result.changes === 0) {
				return reply.status(404).send({
					success: false,
					error: 'Utilisateur non bloque'
				});
			}

			// Log
			await userRepo.logSecurityAction({
				user_id: currentUser.id,
				action: 'USER_UNBLOCKED',
				ip_address: request.ip,
				user_agent: request.headers['user-agent'],
				success: true,
				details: JSON.stringify({ unblocked_user_id: id })
			});

			reply.send({
				success: true,
				message: 'Utilisateur debloque avec succes',
			});
		} catch (error: any) {
			request.log.error('Erreur lors du debloquage de l utilisateur:', error);
			reply.status(500).send({
				success: false,
				error: 'Erreur lors du debloquage de l utilisateur'
			});
		}
	});
}