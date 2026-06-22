import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { pin } = await req.json();
    if (!pin) return NextResponse.json({ error: 'PIN required' }, { status: 400 });
    
    // Only hash if it's not already a bcrypt hash
    if (pin.startsWith('$2a$') || pin.startsWith('$2b$')) {
        return NextResponse.json({ hash: pin });
    }

    const hash = await bcrypt.hash(pin, 10);
    return NextResponse.json({ hash });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to hash PIN' }, { status: 500 });
  }
}
