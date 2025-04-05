export type ParseResult<V, E> = { ok: true; value: V } | { ok: false; error: E };

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
  }
}

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
