import { z } from 'zod';
import { Route } from '../route.js';

export interface RouteMatch {
  route: Route<z.ZodAny, z.ZodAny>;
  params?: Record<string, string>;
}

export const parseParameters = (urlSegments: string[], routeSegments: string[]): Record<string, string> | null => {
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

  return Object.keys(params).length > 0 ? params : null;
};
