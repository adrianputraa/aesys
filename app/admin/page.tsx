import DefaultLayout from '@/components/layout/default';
import { Spinner } from '@/components/ui/spinner';
import dynamic from 'next/dynamic';

const AdministratorPage = dynamic(() => import('@/features/administrator'), {
  loading: () => <Spinner />,
});

export default async function AdministratorRoute() {
  return (
    <DefaultLayout>
      <AdministratorPage />
    </DefaultLayout>
  );
}
