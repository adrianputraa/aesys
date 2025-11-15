'use client';

import { Spinner } from '@/components/ui/spinner';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const AdminsitatorPageContent = dynamic(() => import('@/features/administrator/content'), {
  loading: () => <Spinner />,
  ssr: false,
});

export default function AdministratorPage() {
  const { status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return (
      <main>
        <Spinner />
      </main>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <main className="container mx-auto">
        <p className="font-medium text-center text-sm my-8">Not authenticated</p>
      </main>
    );
  }

  return (
    <main>
      <AdminsitatorPageContent />
    </main>
  );
}
