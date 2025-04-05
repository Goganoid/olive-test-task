import { z } from 'zod';

export interface Request<TBody, TParams> {
  url: string;
  params: TParams;
  method: HttpMethod;
  headers: Record<string, string>;
  body: TBody;
}

export interface Response<T> {
  statusCode: number;
  body: T;
}

export type RequestHandler<TRequest, TParams> = (req: Request<TRequest, TParams>) => Promise<Response<any>>;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface Schema<TBodySchema extends z.ZodSchema, TParamsSchema extends z.ZodSchema> {
  body: TBodySchema;
  params: TParamsSchema;
}

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
