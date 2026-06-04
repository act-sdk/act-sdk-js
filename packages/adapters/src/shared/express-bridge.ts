import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const MCP_METHODS = new Set(['GET', 'POST', 'DELETE']);

export function toFetchRequest(req: ExpressRequest): Request {
  const host = req.get('host') ?? 'localhost';
  const protocol = req.protocol ?? 'http';
  const url = `${protocol}://${host}${req.originalUrl || req.url}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const part of value) {
        headers.append(key, part);
      }
    } else {
      headers.set(key, value);
    }
  }

  const method = req.method ?? 'GET';
  const init: RequestInit & { duplex?: 'half' } = { method, headers };

  if (method !== 'GET' && method !== 'HEAD' && req.readable && !req.readableEnded) {
    init.body = req as unknown as BodyInit;
    init.duplex = 'half';
  }

  return new globalThis.Request(url, init);
}

export async function writeFetchResponse(
  res: ExpressResponse,
  response: Response,
): Promise<void> {
  res.status(response.status);

  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'transfer-encoding') return;
    res.setHeader(key, value);
  });

  if (!response.body) {
    res.end();
    return;
  }

  await pipeline(
    Readable.fromWeb(response.body as import('node:stream/web').ReadableStream),
    res,
  );
}

export function isMcpMethod(method: string | undefined): boolean {
  return MCP_METHODS.has(method ?? '');
}
