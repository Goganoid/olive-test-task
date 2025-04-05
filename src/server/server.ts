import http from 'http';
import { HttpMethod, Request, Route, RouteConfig } from './types';
import { z } from 'zod';

interface RouteMatch {
  route: Route<z.ZodAny, z.ZodAny>;
  params?: Record<string, string>;
}

type ParseResult<V, E> = { ok: true; value: V } | { ok: false; error: E };
type RequestBodyParseResult = ParseResult<any, string>;
type RequestParamsParseResult = ParseResult<RouteMatch, z.ZodError<any>>;

const parseParameters = (urlSegments: string[], routeSegments: string[]): Record<string, string> | undefined => {
  const params: Record<string, string> = {};

  for (let i = 0; i < routeSegments.length; i++) {
    const routeSegment = routeSegments[i];
    const urlSegment = urlSegments[i];

    if (routeSegment.startsWith(':')) {
      // This is a parameter, extract the value
      const paramName = routeSegment.substring(1);
      params[paramName] = urlSegment;
    } else if (routeSegment !== urlSegment) {
      // This is a static segment and it doesn't match
      break;
    }
  }

  return Object.keys(params).length > 0 ? params : undefined;
};

const findMatchingRoute = (
  routes: Route<z.ZodAny, z.ZodAny>[],
  url: string,
  method: string,
): RequestParamsParseResult | undefined => {
  const urlSegments = url.split('/').filter(Boolean);
  for (const route of routes) {
    if (route.method !== method) continue;

    const routeSegments = route.path.split('/').filter(Boolean);
    if (urlSegments.length !== routeSegments.length) continue;

    const params = parseParameters(urlSegments, routeSegments);

    const parseResult = route.schema.params.safeParse(params);
    if (!parseResult.success) {
      return { ok: false, error: parseResult.error };
    }
    return { ok: true, value: { route, params } };
  }

  return undefined;
};

const parseRequestJson = (req: http.IncomingMessage): Promise<{ ok: boolean; body: unknown | null }> => {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        if (body) {
          resolve(JSON.parse(body));
        } else {
          resolve({ ok: true, body: null });
        }
      } catch (error) {
        console.error('Error parsing request body:', error);
        resolve({ ok: false, body: null });
      }
    });
  });
};

const parseRequestBody = async (req: http.IncomingMessage, route: Route<any, any>): Promise<RequestBodyParseResult> => {
  const { ok, body } = await parseRequestJson(req);
  if (!ok) {
    return {
      ok: false,
      error: 'Invalid JSON',
    };
  }
  if (route.schema?.body) {
    try {
      const parsedBody = await route.schema.body.parseAsync(body);
      return { ok: true, value: parsedBody };
    } catch (error) {
      console.error('Error parsing request body:', error);
      return { ok: false, error: 'Invalid JSON' };
    }
  }
  return { ok: true, value: body };
};

const sendJsonResponse = (res: http.ServerResponse, statusCode: number, body: any) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

const createServer = (config: RouteConfig) => {
  const server = http.createServer(async (req, res) => {
    try {
      if (!req.url || !req.method) {
        sendJsonResponse(res, 400, { error: 'Bad Request' });
        return;
      }
      console.log(`Handling request: ${req.url} ${req.method}`);

      const routeMatch = findMatchingRoute(config.routes, req.url, req.method);

      if (!routeMatch) {
        sendJsonResponse(res, 404, { error: 'Not Found' });
        return;
      }

      if (!routeMatch.ok) {
        sendJsonResponse(res, 400, { error: routeMatch.error.message });
        return;
      }

      const requestBody = await parseRequestBody(req, routeMatch.value.route);
      if (!requestBody.ok) {
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
      console.error('Error handling request:', error);
      sendJsonResponse(res, 500, { error: 'Internal Server Error' });
    }
  });

  return server;
};

export { createServer };
