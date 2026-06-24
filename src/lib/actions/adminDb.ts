'use server';

import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function getAdminSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('codadmin_token')?.value;
    if (!token) return null;
    
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret');
    const { payload } = await jwtVerify(token, secret);
    
    return payload as { storeIds: string[], role: string, isSuperAdmin: boolean, username: string };
  } catch (error) {
    return null;
  }
}

function validateStoreAccess(session: any, storeId: string | undefined): boolean {
  if (session.isSuperAdmin) return true;
  if (!storeId) return false;
  return session.storeIds.includes(storeId);
}

export async function adminDbSelect(table: string, match?: Record<string, any>, options?: { orderColumn?: string, ascending?: boolean, limit?: number }) {
  const session = await getAdminSession();
  if (!session) return { data: null, error: 'Unauthorized' };

  let query = supabaseAdmin.from(table).select('*');

  // Enforce isolation for non-superadmins
  if (!session.isSuperAdmin) {
    if (table === 'stores') {
      query = query.in('id', session.storeIds);
    } else {
      query = query.in('store_id', session.storeIds);
    }
  }

  if (match) {
    for (const [key, value] of Object.entries(match)) {
      query = query.eq(key, value);
    }
  }

  if (options?.orderColumn) {
    query = query.order(options.orderColumn, { ascending: options.ascending ?? true });
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  return { data, error: error?.message };
}

export async function adminDbInsert(table: string, payload: any) {
  const session = await getAdminSession();
  if (!session) return { data: null, error: 'Unauthorized' };

  const storeId = table === 'stores' ? payload.id : payload.store_id;
  if (!validateStoreAccess(session, storeId)) {
    return { data: null, error: 'Unauthorized store access' };
  }

  const { data, error } = await supabaseAdmin.from(table).insert(payload).select();
  return { data, error: error?.message };
}

export async function adminDbUpdate(table: string, match: Record<string, any>, payload: any) {
  const session = await getAdminSession();
  if (!session) return { data: null, error: 'Unauthorized' };

  let query = supabaseAdmin.from(table).update(payload);
  
  if (!session.isSuperAdmin) {
    if (table === 'stores') {
      if (!session.storeIds.includes(match.id)) return { error: 'Unauthorized store access' };
    } else {
      query = query.in('store_id', session.storeIds);
    }
  }

  for (const [key, value] of Object.entries(match)) {
    if (Array.isArray(value)) {
      query = query.in(key, value);
    } else {
      query = query.eq(key, value);
    }
  }

  const { data, error } = await query.select();
  return { data, error: error?.message };
}

export async function adminDbDelete(table: string, match: Record<string, any>) {
  const session = await getAdminSession();
  if (!session) return { data: null, error: 'Unauthorized' };

  let query = supabaseAdmin.from(table).delete();

  if (!session.isSuperAdmin) {
    if (table === 'stores') {
      if (!session.storeIds.includes(match.id)) return { error: 'Unauthorized store access' };
    } else {
      query = query.in('store_id', session.storeIds);
    }
  }

  for (const [key, value] of Object.entries(match)) {
    if (Array.isArray(value)) {
      query = query.in(key, value);
    } else {
      query = query.eq(key, value);
    }
  }

  const { data, error } = await query;
  return { data, error: error?.message };
}

export async function adminDbUpsert(table: string, payload: any, options?: { onConflict?: string }) {
  const session = await getAdminSession();
  if (!session) return { data: null, error: 'Unauthorized' };

  const storeId = table === 'stores' ? payload.id : payload.store_id;
  if (!validateStoreAccess(session, storeId)) {
    return { data: null, error: 'Unauthorized store access' };
  }

  const { data, error } = await supabaseAdmin.from(table).upsert(payload, options).select();
  return { data, error: error?.message };
}
