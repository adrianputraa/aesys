'use client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CheckIcon, LogOutIcon, User2Icon } from 'lucide-react';
import { Fragment, useState } from 'react';
import AuthLoginForm from '@/components/form/login';
import { signOut, useSession } from 'next-auth/react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

export default function LoginDialog() {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';

  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
  };

  const onClose = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost">
          <User2Icon />
          Login
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Login</DialogTitle>
          <DialogDescription>Login to an account to access more features.</DialogDescription>
        </DialogHeader>

        <section id="body" className="w-full space-y-4 mx-auto">
          {isAuthenticated ? (
            <Fragment>
              <Alert className="border-transparent">
                <CheckIcon />
                <AlertTitle>Already Logged In</AlertTitle>
                <AlertDescription>You&apos;re already authenticated, you can close this dialog.</AlertDescription>
              </Alert>

              <Button className="ml-auto" onClick={handleLogout}>
                <LogOutIcon />
                Logout
              </Button>
            </Fragment>
          ) : (
            <AuthLoginForm onBackAction={onClose} onMoveAction={onClose} isModal />
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
