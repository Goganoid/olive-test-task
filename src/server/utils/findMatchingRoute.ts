import z from 'zod';
import { ParseResult } from '../types';
import { parseParameters, RouteMatch } from './parseParameters';
import { Route } from '../route';

type RequestParamsParseResult = ParseResult<RouteMatch, z.ZodError<any>>;

const isRouteMatches = (urlSegments: string[], routeSegments: string[]): boolean => {
  if (urlSegments.length !== routeSegments.length) return false;
  for (let i = 0; i < routeSegments.length; i++) {
    if (routeSegments[i].startsWith(':')) continue;
    if (routeSegments[i] !== urlSegments[i]) return false;
  }
  return true;
};

export const findMatchingRoute = (
  routes: Route<z.ZodAny, z.ZodAny>[],
  url: string,
  method: string,
): RequestParamsParseResult | undefined => {
  const urlSegments = url.split('/').filter(Boolean);
  for (const route of routes) {
    if (route.method !== method) continue;

    const routeSegments = route.path.split('/').filter(Boolean);
    if (!isRouteMatches(urlSegments, routeSegments)) continue;

    const params = parseParameters(urlSegments, routeSegments);
    const parseResult = route.schema.params.safeParse(params);
    if (!parseResult.success) {
      return { ok: false, error: parseResult.error };
    }
    return { ok: true, value: { route, params: parseResult.data } };
  }

  return undefined;
};
