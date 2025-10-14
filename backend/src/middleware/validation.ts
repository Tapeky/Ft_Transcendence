import { FastifyRequest, FastifyReply } from 'fastify';

export const VALIDATION_LIMITS = {
  EMAIL_MAX_LENGTH: 254,
  USERNAME_MAX_LENGTH: 50,
  PASSWORD_MAX_LENGTH: 128,
  DISPLAY_NAME_MAX_LENGTH: 100,
  TOURNAMENT_NAME_MAX_LENGTH: 100,
  TOURNAMENT_DESCRIPTION_MAX_LENGTH: 500,
  ALIAS_MAX_LENGTH: 50,
  GUEST_NAME_MAX_LENGTH: 50,
  MATCH_DATA_MAX_LENGTH: 10000,
  GAME_TYPE_MAX_LENGTH: 20,
};

export function validateInputLengths(data: any): void {
  if (!data || typeof data !== 'object') {
    return;
  }

  const errors: string[] = [];

  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'string') {
      let maxLength: number;

      switch (key) {
        case 'email':
          maxLength = VALIDATION_LIMITS.EMAIL_MAX_LENGTH;
          break;
        case 'username':
          maxLength = VALIDATION_LIMITS.USERNAME_MAX_LENGTH;
          break;
        case 'password':
        case 'current_password':
        case 'new_password':
          maxLength = VALIDATION_LIMITS.PASSWORD_MAX_LENGTH;
          break;
        case 'display_name':
          maxLength = VALIDATION_LIMITS.DISPLAY_NAME_MAX_LENGTH;
          break;
        case 'name':
          maxLength = VALIDATION_LIMITS.TOURNAMENT_NAME_MAX_LENGTH;
          break;
        case 'description':
          maxLength = VALIDATION_LIMITS.TOURNAMENT_DESCRIPTION_MAX_LENGTH;
          break;
        case 'alias':
          maxLength = VALIDATION_LIMITS.ALIAS_MAX_LENGTH;
          break;
        case 'player1_guest_name':
        case 'player2_guest_name':
          maxLength = VALIDATION_LIMITS.GUEST_NAME_MAX_LENGTH;
          break;
        case 'match_data':
          maxLength = VALIDATION_LIMITS.MATCH_DATA_MAX_LENGTH;
          break;
        case 'game_type':
          maxLength = VALIDATION_LIMITS.GAME_TYPE_MAX_LENGTH;
          break;
        default:
          return;
      }

      if (value.length > maxLength) {
        errors.push(
          `Le champ '${key}' ne peut pas dépasser ${maxLength} caractères (actuellement: ${value.length})`
        );
      }
    }
  });

  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }
}

export function validateInput(schema: any) {
  return async function validator(request: FastifyRequest, reply: FastifyReply) {
    try {
      if (schema.body) {
        validateObject(request.body, schema.body);
      }
      if (schema.params) {
        validateObject(request.params, schema.params);
      }
      if (schema.query) {
        validateObject(request.query, schema.query);
      }
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        error: 'Données invalides',
        details: error.message,
      });
    }
  };
}

export async function validateDisplayname(request: FastifyRequest, reply: FastifyReply) {
  const data = request.body;
  if (!data || typeof data !== 'object')
    return reply.status(400).send({ error: 'Invalid request body' });

  const dataObj = data as any;
  if (!dataObj.display_name || typeof dataObj.display_name !== 'string')
    return reply.status(400).send({ error: 'display_name is required and must be a string' });

  const displayname = dataObj.display_name;

  if (displayname.length > 12) {
    return reply.status(400).send({
      success: false,
      error: 'Le pseudo ne peut pas dépasser 12 caractères',
    });
  }

  if (!/^[a-zA-Z0-9_]+$/.test(displayname)) {
    return reply.status(400).send({
      success: false,
      error: 'Le pseudo ne peut contenir que des lettres, chiffres et underscores',
    });
  }

  return;
}

export async function validateAlias(request: FastifyRequest, reply: FastifyReply) {
  const data = request.body;
  if (!data || typeof data !== 'object')
    return reply.status(400).send({ error: 'Invalid request body' });

  const dataObj = data as any;
  if (!dataObj.alias || typeof dataObj.alias !== 'string')
    return reply.status(400).send({ error: 'alias is required and must be a string' });

  const alias = dataObj.alias.trim();

  if (alias.length === 0) {
    return reply.status(400).send({
      success: false,
      error: "L'alias ne peut pas être vide",
    });
  }

  if (alias.length > 50) {
    return reply.status(400).send({
      success: false,
      error: "L'alias ne peut pas dépasser 50 caractères",
    });
  }

  if (!/^[a-zA-Z0-9_\-]+$/.test(alias)) {
    return reply.status(400).send({
      success: false,
      error: "L'alias ne peut contenir que des lettres, chiffres, underscores et tirets",
    });
  }

  return;
}

function validateObject(obj: any, schema: any): void {
  for (const [key, rules] of Object.entries(schema)) {
    const value = obj?.[key];
    const ruleSet = rules as any;

    if (ruleSet.required && (value === undefined || value === null || value === '')) {
      throw new Error(`Le champ '${key}' est requis`);
    }

    if (value !== undefined && ruleSet.type) {
      if (ruleSet.type === 'string' && typeof value !== 'string') {
        throw new Error(`Le champ '${key}' doit être une chaîne de caractères`);
      }

      if (ruleSet.type === 'number') {
        if (typeof value === 'string' && !isNaN(Number(value))) {
          obj[key] = Number(value);
        } else if (typeof value !== 'number') {
          throw new Error(`Le champ '${key}' doit être un nombre`);
        }
      }

      if (ruleSet.type === 'email' && typeof value === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          throw new Error(`Le champ '${key}' doit être un email valide`);
        }
      }

      if (ruleSet.type === 'boolean' && typeof value !== 'boolean') {
        throw new Error(`Le champ '${key}' doit être un booléen`);
      }
    }

    if (value && ruleSet.minLength && value.length < ruleSet.minLength) {
      throw new Error(`Le champ '${key}' doit faire au moins ${ruleSet.minLength} caractères`);
    }

    if (value && ruleSet.maxLength && value.length > ruleSet.maxLength) {
      throw new Error(`Le champ '${key}' ne peut pas dépasser ${ruleSet.maxLength} caractères`);
    }
  }
}
