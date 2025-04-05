import http from 'http';
import { z } from 'zod';
import { ParseResult } from '../types.js';
import { logger } from '../../utils/logger.js';
import { Route } from '../route.js';

type RequestBodyParseResult = ParseResult<any, any>;

const parseRequestJson = (req: http.IncomingMessage): Promise<{ ok: boolean; body: unknown | null }> => {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        if (body) {
          resolve({ ok: true, body: JSON.parse(body) });
        } else {
          resolve({ ok: true, body: null });
        }
      } catch (error) {
        logger.error('Error parsing request body:', error);
        resolve({ ok: false, body: null });
      }
    });
  });
};

export const parseRequestBody = async (
  req: http.IncomingMessage,
  route: Route<z.ZodAny, z.ZodAny>,
): Promise<RequestBodyParseResult> => {
  const { ok, body } = await parseRequestJson(req);
  if (!ok) {
    return {
      ok: false,
      error: 'Invalid JSON',
    };
  }
  if (route.schema?.body) {
    const parsedBody = await route.schema.body.safeParseAsync(body);
    if (!parsedBody.success) {
      return { ok: false, error: parsedBody.error };
    }
    return { ok: true, value: parsedBody.data };
  }
  return { ok: true, value: body };
};
