import type { Request } from 'express';

/**
 * Safely extracts the isolated user/device ID from incoming request.
 * Priority:
 * 1. 'x-user-id' header sent by client fetch
 * 2. 'device_id' cookie
 * 3. fallback 'user-guest' (which has 0 credits and 0 tracks)
 */
export function getUserIdFromRequest(req: any): string {
  if (!req) return 'user-guest';
  
  // Express header
  const headerUserId = (typeof req.get === 'function' ? req.get('x-user-id') : req.headers?.['x-user-id'])?.trim();
  if (headerUserId && headerUserId.length > 0) {
    return headerUserId;
  }

  // Cookie in express
  const cookieHeader = (typeof req.get === 'function' ? req.get('cookie') : req.headers?.cookie) || '';
  const match = cookieHeader.match(/(?:^|;\s*)device_id=([^;]+)/);
  if (match && match[1]) {
    const val = decodeURIComponent(match[1].trim());
    if (val) return val;
  }

  if (req.cookies && req.cookies.device_id) {
    return String(req.cookies.device_id).trim();
  }

  return 'user-guest';
}
