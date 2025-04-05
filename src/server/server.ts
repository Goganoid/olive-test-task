import http from 'http';
import { logger } from '../utils/logger.js';
import { ApiError, HttpMethod, Request } from './types.js';
import { findMatchingRoute } from './utils/findMatchingRoute.js';
import { parseRequestBody } from './utils/parseRequestBody.js';
import { RouteConfig } from './route.js';

const sendJsonResponse = (res: http.ServerResponse, statusCode: number, body: any) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

/**
 * Creates a server that listens for incoming requests and routes them to the appropriate handler.
 * @param config - The configuration for the server.
 * @returns A server instance.
 */
const createServer = (config: RouteConfig) => {
  const server = http.createServer(async (req, res) => {
    try {
      logger.debug(`Handling request: ${req.url} ${req.method}`);
      if (!req.url || !req.method) {
        sendJsonResponse(res, 400, { error: 'Bad Request' });
        return;
      }

      const routeMatch = findMatchingRoute(config.routes, req.url, req.method);

      if (!routeMatch) {
        logger.info('No route match found');
        sendJsonResponse(res, 404, { error: 'Not Found' });
        return;
      }

      if (!routeMatch.ok) {
        logger.info('Error parsing request params:', routeMatch.error.errors);
        sendJsonResponse(res, 400, { error: routeMatch.error.message });
        return;
      }

      const requestBody = await parseRequestBody(req, routeMatch.value.route);
      if (!requestBody.ok) {
        logger.info('Error parsing request body:', requestBody.error);
        sendJsonResponse(res, 400, { error: requestBody.error });
        return;
      }
      const request: Request<any, any> = {
        url: req.url,
        method: req.method as HttpMethod,
        headers: req.headers as Record<string, string>,
        body: requestBody.value,
        params: routeMatch.value.params,
      };

      const response = await routeMatch.value.route.handler(request);

      sendJsonResponse(res, response.statusCode, response.body);
    } catch (error) {
      logger.error('Error handling request:', error);
      if (error instanceof ApiError) {
        sendJsonResponse(res, error.statusCode, { error: error.message });
      } else {
        sendJsonResponse(res, 500, { error: 'Internal Server Error' });
      }
    }
  });

  return server;
};

export { createServer };
