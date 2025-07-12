import { FastifyRequest, FastifyReply } from 'fastify';
import path from 'path';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp'
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const IMAGE_MAGIC_BYTES = {
  jpeg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47],
  webp: [0x52, 0x49, 0x46, 0x46]
};

export const validateImageUpload = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const data = await request.file();
    
    if (!data) {
      return reply.status(400).send({
        success: false,
        error: 'Aucun fichier fourni'
      });
    }

    // LECTURE SÉCURISÉE avec limite de taille
    const chunks: Buffer[] = [];
    let totalSize = 0;
    
    for await (const chunk of data.file) {
      totalSize += chunk.length;
      
      // Vérification de taille en temps réel pour éviter les attaques DoS
      if (totalSize > MAX_FILE_SIZE) {
        return reply.status(400).send({
          success: false,
          error: `Fichier trop volumineux. Taille maximale: ${MAX_FILE_SIZE / 1024 / 1024}MB`
        });
      }
      
      chunks.push(chunk);
    }
    
    const buffer = Buffer.concat(chunks);

    // MIME TYPE
    if (!ALLOWED_MIME_TYPES.includes(data.mimetype)) {
      return reply.status(400).send({
        success: false,
        error: `Type de fichier non supporté. Types autorisés: ${ALLOWED_MIME_TYPES.join(', ')}`
      });
    }

    // EXTENSION
    const ext = path.extname(data.filename).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return reply.status(400).send({
        success: false,
        error: `Extension non autorisée. Extensions autorisées: ${ALLOWED_EXTENSIONS.join(', ')}`
      });
    }

    // MAGIC BYTES (validation)
    let isValidImage = false;
    
    if (data.mimetype.includes('jpeg')) {
      const jpegBytes = IMAGE_MAGIC_BYTES.jpeg;
      isValidImage = jpegBytes.every((byte, index) => buffer[index] === byte);
    } else if (data.mimetype.includes('png')) {
      const pngBytes = IMAGE_MAGIC_BYTES.png;
      isValidImage = pngBytes.every((byte, index) => buffer[index] === byte);
    } else if (data.mimetype.includes('webp')) {
      const webpBytes = IMAGE_MAGIC_BYTES.webp;
      isValidImage = webpBytes.every((byte, index) => buffer[index] === byte);
    }

    if (!isValidImage) {
      return reply.status(400).send({
        success: false,
        error: 'Le fichier ne semble pas être une image valide'
      });
    }

    // Data added to request for further processing
    (request as any).fileData = {
      buffer,
      mimetype: data.mimetype,
      originalname: data.filename,
      size: buffer.length
    };

  } catch (error: any) {
    request.log.error('Erreur validation upload:', error);
    return reply.status(400).send({
      success: false,
      error: 'Erreur lors de la validation du fichier'
    });
  }
};