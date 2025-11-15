'use client';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { LogOutIcon } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Fragment } from 'react/jsx-runtime';
import Products from './product';

const Carousel = dynamic(() => import('./carousel'), {
  loading: () => <Spinner />,
});

const videoArray = Array.from({ length: 10 });

export default function Dashboard() {
  const { data: session, status } = useSession();

  const logoutAction = async () => {
    try {
      await signOut({ redirect: true });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <section>
      <Carousel />

      <div className="container mx-auto p-4">
        <Products name="Products" data={videoArray} />
        {status === 'loading' ? (
          <div className="flex justify-center">
            <Spinner />
          </div>
        ) : (
          <Fragment>
            <p>User ID: {session?.user?.id}</p>
            <Button onClick={logoutAction}>
              <LogOutIcon />
              Logout
            </Button>
          </Fragment>
        )}
      </div>
    </section>
  );
}
