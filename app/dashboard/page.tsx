import type { Metadata, ResolvingMetadata } from 'next';
import DefaultLayout from '@/components/layout/default';
import dynamic from 'next/dynamic';
import { Spinner } from '@/components/ui/spinner';

const Dashboard = dynamic(() => import('@/features/home'), {
  loading: () => <Spinner />,
});

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params, searchParams }: Props, parent: ResolvingMetadata): Promise<Metadata> {
  // const slug = (await params).slug;

  // fetch post information
  // const post = await fetch(`https://api.vercel.app/blog/${slug}`).then((res) => res.json());

  return {
    title: 'Dashboard - Watcher',
    description: 'Welcome to watcher',
  };
}

export default function Home() {
  return (
    <DefaultLayout>
      <Dashboard />
    </DefaultLayout>
  );
}
