import type { Metadata, ResolvingMetadata } from 'next';
import DefaultLayout from '@/components/layout/default';
import Dashboard from '@/features/home';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params, searchParams }: Props, parent: ResolvingMetadata): Promise<Metadata> {
  // const slug = (await params).slug;

  // fetch post information
  // const post = await fetch(`https://api.vercel.app/blog/${slug}`).then((res) => res.json());

  return {
    title: 'Welcome to Watcher',
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
