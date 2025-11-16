import DefaultLayout from '@/components/layout/default';
import { Spinner } from '@/components/ui/spinner';
import dynamic from 'next/dynamic';

const AdministratorProductAddPage = dynamic(() => import('@/features/administrator/product/add'), {
  loading: () => <Spinner />,
});

export default async function AdministratorProductAddRoute() {
  return (
    <DefaultLayout>
      <AdministratorProductAddPage />
    </DefaultLayout>
  );
}
