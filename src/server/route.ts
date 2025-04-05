import z from 'zod';
import { HttpMethod, RequestHandler } from './types';

interface Schema<TBodySchema extends z.ZodSchema, TParamsSchema extends z.ZodSchema> {
  body: TBodySchema;
  params: TParamsSchema;
}
/**
 * This class is used to define a route for the server.
 * It is used to define the path, method, handler, and schema for the route.
 * The optional schema parameter uses zod to define the shape of the body and params. The type is inferred and can be used in the handler.
 */
export class Route<TBodySchema extends z.ZodSchema, TParamsSchema extends z.ZodSchema> {
  public readonly schema: Schema<TBodySchema, TParamsSchema> = {
    // @ts-expect-error: This is a workaround to allow the schema to be optional
    body: z.any(),
    // @ts-expect-error: This is a workaround to allow the schema to be optional
    params: z.any(),
  };

  constructor(
    public readonly path: string,
    public readonly method: HttpMethod,
    public readonly handler: RequestHandler<z.infer<TBodySchema>, z.infer<TParamsSchema>>,
    schema?: Partial<Schema<TBodySchema, TParamsSchema>>,
  ) {
    this.schema = {
      ...this.schema,
      ...schema,
    };
  }
}

export interface RouteConfig {
  routes: Route<any, any>[];
}
