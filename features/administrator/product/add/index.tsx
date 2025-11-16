'use client';

import { Fragment } from 'react/jsx-runtime';
import AdministratorPageHeader from '../../header';
import dynamic from 'next/dynamic';
import { Spinner } from '@/components/ui/spinner';

const AddProductForm = dynamic(() => import('./form'), {
  loading: () => <Spinner />,
  ssr: false,
});

export default function AdministratorProductAddPage() {
  return (
    <Fragment>
      <section id="header">
        <AdministratorPageHeader title="Add new product" description="Add a new product to database" />
      </section>

      <section id="body" className="container max-w-lg mx-auto">
        <div className="p-4">
          <AddProductForm />
        </div>
      </section>
    </Fragment>
  );
}
