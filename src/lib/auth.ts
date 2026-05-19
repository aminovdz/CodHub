import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-super-secret-key-123456';
const key = new TextEncoder().encode(JWT_SECRET);

export interface SessionPayload {
  username: string;
  role: 'admin' | 'fulfillment' | 'confirmation';
  storeIds?: string[];
  isSuperAdmin: boolean;
  [key: string]: any;
}

export async function encrypt(payload: SessionPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(key);
}

export async function decrypt(input: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ['HS256'],
  });
  return payload as SessionPayload;
}
