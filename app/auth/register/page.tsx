import type { Metadata, ResolvingMetadata } from 'next';
import DefaultLayout from '@/components/layout/default';
import AuthRegisterPage from '@/features/auth/register';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params, searchParams }: Props, parent: ResolvingMetadata): Promise<Metadata> {
  // const slug = (await params).slug;

  // fetch post information
  // const post = await fetch(`https://api.vercel.app/blog/${slug}`).then((res) => res.json());

  return {
    title: 'Register - Watcher',
    description: 'Register to create a new account',
  };
}

export default function AuthRegisterRoute() {
  return (
    <DefaultLayout>
      <AuthRegisterPage />
    </DefaultLayout>
  );
}
