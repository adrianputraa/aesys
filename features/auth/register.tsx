import { Spinner } from '@/components/ui/spinner';
import dynamic from 'next/dynamic';

const AuthRegisterForm = dynamic(() => import('@/components/form/register'), {
  loading: () => <Spinner />,
});

export default function AuthRegister() {
  return (
    <section id="login" className="container p-2 bg-background mx-auto">
      <div
        id="form_container"
        className="lg:aspect-16/8 mt-4 grid lg:grid-cols-2 items-center gap-4 p-2 border rounded-lg"
      >
        <AuthFormBanner />
        <AuthRegisterForm />
      </div>
    </section>
  );
}

function AuthFormBanner() {
  return <div id="form_image" className="w-full h-full min-h-48 lg:min-h-96 bg-muted rounded-lg" />;
}
