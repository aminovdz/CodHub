import { SignJWT, jwtVerify } from 'jose';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set. Please configure it in .env');
  return new TextEncoder().encode(secret);
};

export interface SessionPayload {
  username: string;
  role: 'admin' | 'fulfillment' | 'confirmation';
  storeIds?: string[];
  isSuperAdmin: boolean;
  [key: string]: any;
}

export async function encrypt(payload: SessionPayload) {
  const key = getJwtSecret();
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(key);
}

export async function decrypt(input: string): Promise<SessionPayload> {
  const key = getJwtSecret();
  const { payload } = await jwtVerify(input, key, {
    algorithms: ['HS256'],
  });
  return payload as SessionPayload;
}
