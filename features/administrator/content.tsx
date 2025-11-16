'use client';

import { Fragment } from 'react/jsx-runtime';
import AdministratorPageHeader from './header';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users2Icon } from 'lucide-react';
import { ProductContent, ProductTrigger } from './product';

export default function AdministratorPageContent() {
  return (
    <Fragment>
      <section id="header">
        <AdministratorPageHeader />
      </section>

      <section id="body" className="p-4">
        <Tabs defaultValue="products">
          <TabsList>
            <ProductTrigger />
            <UserTrigger />
          </TabsList>

          <ProductContent />
        </Tabs>
      </section>
    </Fragment>
  );
}

const UserTrigger = () => {
  return (
    <TabsTrigger value="users">
      <Users2Icon />
      Users
    </TabsTrigger>
  );
};
