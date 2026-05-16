import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function Home() {
  const cookieStore = await cookies();
  const region = cookieStore.get('codhub_region')?.value || 'dz';
  redirect(`/${region}`);
}
