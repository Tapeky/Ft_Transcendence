import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateToken, validateInput } from '../middleware';
import { validateImageUpload } from '../middleware/uploadValidation';
import { DatabaseManager } from '../database/DatabaseManager';
import { UserRepository } from '../repositories/UserRepository';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

export async function avatarsRoutes(fastify: FastifyInstance) {
  const db = DatabaseManager.getInstance().getDb();
  const userRepo = new UserRepository(db);
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const avatars = [
        {
          id: 'default',
          name: 'default',
          url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default&backgroundColor=b6e3f4',
        },
        {
          id: 'avatar-1',
          name: 'Avatar Style 1',
          url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=gaming1&backgroundColor=c0aede',
        },
        {
          id: 'avatar-2',
          name: 'Avatar Style 2',
          url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=gaming2&backgroundColor=d1d4f9',
        },
        {
          id: 'avatar-3',
          name: 'Avatar Style 3',
          url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=gaming3&backgroundColor=fecaca',
        },
      ];

      reply.send({
        success: true,
        data: avatars,
        message: 'liste des avatars récupérée avec succès',
      });
    } catch (error: any) {
      request.log.error('Error fetching avatars:', error);
      reply.status(500).send({
        success: false,
        error_id: "internal_error",
        error: 'Internal Server Error',
      });
    }
  });

  fastify.put(
    '/set',
    {
      preHandler: [
        authenticateToken,
        validateInput({
          body: {
            avatar_id: { required: true, type: 'string' },
          },
        }),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const currentUser = request.user as { id: number; username: string; email: string };
        const { avatar_id } = request.body as { avatar_id: string };

        const validAvatars = ['default', 'avatar-1', 'avatar-2', 'avatar-3'];

        if (!validAvatars.includes(avatar_id)) {
          return reply.status(400).send({
            success: false,
            error_id: "unknown_avatar",
            error: 'Avatar invalide',
          });
        }

        const avatarUrls: Record<string, string> = {
          default: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default&backgroundColor=b6e3f4',
          'avatar-1':
            'https://api.dicebear.com/7.x/avataaars/svg?seed=gaming1&backgroundColor=c0aede',
          'avatar-2':
            'https://api.dicebear.com/7.x/avataaars/svg?seed=gaming2&backgroundColor=d1d4f9',
          'avatar-3':
            'https://api.dicebear.com/7.x/avataaars/svg?seed=gaming3&backgroundColor=fecaca',
        };

        await userRepo.updateProfile(currentUser.id, { avatar_url: avatarUrls[avatar_id] });

        reply.send({
          success: true,
          message: 'Avatar mis a jour avec succes',
          data: {
            avatar_id,
            avatar_url: avatarUrls[avatar_id],
          },
        });
      } catch (error: any) {
        request.log.error('Error updating avatar:', error);
        reply.status(500).send({
          success: false,
          error_id: "internal_error",
          error: 'Internal Server Error',
        });
      }
    }
  );

  fastify.post(
    '/upload',
    {
      preHandler: [authenticateToken, validateImageUpload],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const currentUser = request.user as { id: number; username: string; email: string };
        const { buffer, mimetype } = (request as any).fileData;

        const timestamp = Date.now();
        const extension =
          mimetype === 'image/jpeg' ? 'jpg' : mimetype === 'image/png' ? 'png' : 'webp';
        const filename = `avatar_${currentUser.id}_${timestamp}.${extension}`;

        const uploadsDir = path.join(__dirname, '../../uploads/avatars');
        await fs.mkdir(uploadsDir, { recursive: true });

        const processedBuffer = await sharp(buffer)
          .resize(200, 200, {
            fit: 'cover',
            position: 'center',
          })
          .jpeg({
            quality: 85,
            progressive: true,
          })
          .toBuffer();

        const filePath = path.join(uploadsDir, filename);
        await fs.writeFile(filePath, processedBuffer);

        const avatarUrl = `/uploads/avatars/${filename}`;

        try {
          const currentUserData = await userRepo.findById(currentUser.id);
          if (currentUserData?.avatar_url && currentUserData.avatar_url.startsWith('/uploads/')) {
            const oldFilePath = path.join(__dirname, '../../', currentUserData.avatar_url);
            await fs.unlink(oldFilePath);
          }
        } catch (error) {
          request.log.warn("Impossible de supprimer l'ancien avatar:" + (error instanceof Error ? error.message : String(error)));
        }

        await userRepo.updateProfile(currentUser.id, { avatar_url: avatarUrl });

        reply.send({
          success: true,
          message: 'Avatar uploadé avec succès',
          data: {
            avatar_url: avatarUrl,
            filename: filename,
          },
        });
      } catch (error: any) {
        request.log.error('Error uploading avatar:', error);
        reply.status(500).send({
          success: false,
          error_id: "internal_error",
          error: "Erreur lors de l'upload de l'avatar",
        });
      }
    }
  );
}
