'use client';

import { ChevronLeftIcon, EyeClosed, EyeIcon, KeyIcon, LogInIcon, MailIcon } from 'lucide-react';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText } from '../ui/input-group';
import { Button } from '../ui/button';
import LinkText from '../typography/link';
import ParagraphText from '../typography/paragraph';
import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { LoginFormSchema, loginFormSchema } from './schema/auth';
import { Field, FieldError, FieldGroup, FieldLabel } from '../ui/field';
import { cn } from '@/lib/utils';
import { Spinner } from '../ui/spinner';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';

interface Props {
  isModal?: boolean;
  onMoveAction?: () => any;
  onBackAction?: () => any;
}

export default function AuthLoginForm({ ...props }: Props) {
  const { status } = useSession();
  const router = useRouter();

  const form = useForm({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const formAction = async (value: LoginFormSchema) => {
    try {
      setIsPending(true);

      const res = await signIn('credentials', {
        redirect: false, // don't redirect automatically
        email: value.email,
        password: value.password,
      });

      console.log(res);

      if (res && res.status > 200) {
        if (res.status >= 500) {
          throw new Error('Server or network error.');
        }

        throw new Error('Invalid email or password.');
      } else {
        form.reset();
        onChangeUrl();
        router.push('/dashboard');
      }
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setIsPending(false);
    }
  };

  const onChangeUrl = () => {
    if (props.onMoveAction) {
      props.onMoveAction();
    }
  };

  const onBack = () => {
    if (props.onBackAction) {
      props.onBackAction();
    } else {
      router.back();
    }
  };

  const onSubmit = async (value: LoginFormSchema) => {
    toast.promise(formAction(value), {
      id: 'login_success',
      success: 'Successfully logged in!',
      error: 'Invalid email address or password.',
    });
  };

  const [revealPassword, setRevealPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const disableInteraction = isPending;
  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';

  useEffect(() => {
    if (status === 'authenticated') {
      if (!props.isModal) {
        router.replace('/dashboard');
      }
    }
  }, [status]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="aspect-square size-48 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <form id="login_form" className="p-4 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div id="form_head" className="text-center">
        <p className="font-semibold text-xl text-foreground">Login</p>
        <p className="text-muted-foreground">Login to access more features</p>
      </div>

      <div id="form_body" className="space-y-2">
        <FieldGroup>
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => {
              const { invalid: isInvalid } = fieldState;

              return (
                <Field data-invalid={isInvalid} aria-disabled={disableInteraction}>
                  <FieldLabel htmlFor="form_input_email" className="hidden">
                    Email
                  </FieldLabel>
                  <InputGroup className={cn({ 'text-red-600!': isInvalid })} aria-disabled={disableInteraction}>
                    <InputGroupAddon align="block-start">
                      <MailIcon />
                      <InputGroupText>Email</InputGroupText>
                      {isInvalid && <FieldError errors={[fieldState.error]} />}
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      type="email"
                      id="form_input_email"
                      autoComplete="email"
                      placeholder="Enter email address"
                      disabled={field.disabled || disableInteraction}
                      aria-invalid={isInvalid}
                      aria-disabled={disableInteraction}
                    />
                  </InputGroup>
                </Field>
              );
            }}
          />
        </FieldGroup>
        <FieldGroup>
          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => {
              const { invalid: isInvalid } = fieldState;

              return (
                <Field data-invalid={isInvalid} aria-disabled={disableInteraction}>
                  <FieldLabel htmlFor="input_password" className="hidden">
                    Password
                  </FieldLabel>
                  <InputGroup aria-disabled={disableInteraction}>
                    <InputGroupAddon align="block-start">
                      <KeyIcon />
                      <InputGroupText>Password</InputGroupText>
                      {isInvalid && <FieldError errors={[fieldState.error]} />}
                    </InputGroupAddon>
                    <div className="w-full inline-flex">
                      <InputGroupInput
                        {...field}
                        id="input_password"
                        type={revealPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        aria-invalid={isInvalid}
                        aria-disabled={disableInteraction}
                        disabled={disableInteraction}
                        autoComplete="current-password"
                      />
                      <InputGroupAddon align="inline-end" className="pb-0">
                        <InputGroupButton
                          type="button"
                          variant="link"
                          size="icon-xs"
                          onClick={() => setRevealPassword(!revealPassword)}
                          disabled={disableInteraction}
                        >
                          {revealPassword ? <EyeIcon /> : <EyeClosed />}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </div>
                  </InputGroup>
                </Field>
              );
            }}
          />
        </FieldGroup>
      </div>

      <div id="form_footer" className="space-y-4">
        <ParagraphText className="text-sm">
          Do not have an account?{' '}
          <LinkText href="/auth/register" onClick={onChangeUrl} prefetch>
            create a new account.
          </LinkText>
          <br />
          Forget your password?{' '}
          <LinkText href="/auth/forget" onClick={onChangeUrl} prefetch>
            reset your password.
          </LinkText>
        </ParagraphText>
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={onBack} disabled={disableInteraction}>
            <ChevronLeftIcon />
            Back
          </Button>
          <Button type="submit" disabled={disableInteraction}>
            {disableInteraction ? <Spinner /> : <LogInIcon />}
            Login
          </Button>
        </div>
      </div>
    </form>
  );
}
