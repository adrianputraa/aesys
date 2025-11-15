'use client';

import { ChevronLeftIcon, EyeClosed, EyeIcon, KeyIcon, LogInIcon, MailIcon, UserIcon } from 'lucide-react';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText } from '../ui/input-group';
import { Button } from '../ui/button';
import LinkText from '../typography/link';
import ParagraphText from '../typography/paragraph';
import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { RegisterFormSchema, registerFormSchema } from './schema/auth';
import { Field, FieldError, FieldGroup, FieldLabel } from '../ui/field';
import { cn } from '@/lib/utils';
import { useMutation } from '@tanstack/react-query';
import { handleFetch } from '@/lib/api';
import { Spinner } from '../ui/spinner';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

type Payload = {
  email: string;
  password: string;
};

export default function AuthRegisterForm() {
  const { status } = useSession();
  const router = useRouter();

  const { mutateAsync: formAction, isPending } = useMutation({
    mutationFn: async (payload: Payload) => {
      console.log(payload);
      const { data } = await handleFetch<{ id: number; email: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      return data;
    },
    onSuccess: () => {
      router.push('/auth/login');
    },
  });

  const { control, handleSubmit } = useForm({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (value: RegisterFormSchema) => {
    toast.promise(formAction(value), {
      id: 'register_success',
      success: 'Account created, redirecting to login page...',
    });
  };

  const [revealPassword, setRevealPassword] = useState(false);
  const disableInteraction = isPending;
  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard');
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
    <form id="register_form" className="p-4 space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div id="form_head" className="text-center">
        <p className="font-semibold text-xl text-foreground">Create Account</p>
        <p className="text-muted-foreground">Register to create an account</p>
      </div>

      <div id="form_body" className="space-y-2">
        <FieldGroup>
          <Controller
            name="username"
            control={control}
            render={({ field, fieldState }) => {
              const { invalid: isInvalid } = fieldState;

              return (
                <Field data-invalid={isInvalid} aria-disabled={disableInteraction}>
                  <FieldLabel htmlFor="input_username" className="hidden">
                    Username
                  </FieldLabel>
                  <InputGroup className={cn({ 'text-red-600!': isInvalid })} aria-disabled={disableInteraction}>
                    <InputGroupAddon align="block-start">
                      <UserIcon />
                      <InputGroupText>Username</InputGroupText>
                      {isInvalid && <FieldError errors={[fieldState.error]} />}
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      id="input_username"
                      disabled={disableInteraction}
                      aria-invalid={isInvalid}
                      aria-disabled={disableInteraction}
                      autoComplete="new-username"
                      placeholder="Enter username"
                    />
                  </InputGroup>
                </Field>
              );
            }}
          />
        </FieldGroup>

        <FieldGroup>
          <Controller
            name="email"
            control={control}
            render={({ field, fieldState }) => {
              const { invalid: isInvalid } = fieldState;

              return (
                <Field data-invalid={isInvalid} aria-disabled={disableInteraction}>
                  <FieldLabel htmlFor="input_email" className="hidden">
                    Email Address
                  </FieldLabel>
                  <InputGroup className={cn({ 'text-red-600!': isInvalid })} aria-disabled={disableInteraction}>
                    <InputGroupAddon align="block-start">
                      <MailIcon />
                      <InputGroupText>Email Address</InputGroupText>
                      {isInvalid && <FieldError errors={[fieldState.error]} />}
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      id="input_email"
                      disabled={disableInteraction}
                      aria-invalid={isInvalid}
                      aria-disabled={disableInteraction}
                      autoComplete="email"
                      type="email"
                      placeholder="Enter email address"
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
            control={control}
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
                    </InputGroupAddon>
                    <div className="w-full inline-flex">
                      <InputGroupInput
                        {...field}
                        id="input_password"
                        disabled={disableInteraction}
                        autoComplete="current-password"
                        type={revealPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        aria-invalid={isInvalid}
                        aria-disabled={disableInteraction}
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
                  <div
                    className={cn('border rounded-md shadow-2xs text-muted-foreground text-sm px-4 py-2', {
                      'border-red-600 text-red-600!': !!fieldState.error,
                    })}
                  >
                    <p>Password must include these letters:</p>
                    <ul className="list-disc ml-4">
                      <li>At least one numerical letter</li>
                      <li>At least one upper-case letter</li>
                    </ul>
                    {isInvalid && <FieldError errors={[fieldState.error]} />}
                  </div>
                </Field>
              );
            }}
          />
        </FieldGroup>

        <FieldGroup>
          <Controller
            name="confirmPassword"
            control={control}
            render={({ field, fieldState }) => {
              const { invalid: isInvalid } = fieldState;

              return (
                <Field data-invalid={isInvalid} aria-disabled={disableInteraction}>
                  <FieldLabel htmlFor="input_confirm_password" className="hidden">
                    Confirm Password
                  </FieldLabel>
                  <InputGroup aria-disabled={disableInteraction}>
                    <InputGroupAddon align="block-start">
                      <KeyIcon />
                      <InputGroupText>Confirm Password</InputGroupText>
                    </InputGroupAddon>
                    <div className="w-full inline-flex">
                      <InputGroupInput
                        {...field}
                        id="input_confirm_password"
                        disabled={disableInteraction}
                        autoComplete="password"
                        type={revealPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        aria-invalid={isInvalid}
                        aria-disabled={disableInteraction}
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
                  {isInvalid && (
                    <div
                      className={cn('border rounded-md shadow-2xs text-muted-foreground text-sm px-4 py-2', {
                        'border-red-600 text-red-600!': !!fieldState.error,
                      })}
                    >
                      <FieldError errors={[fieldState.error]} />
                    </div>
                  )}
                </Field>
              );
            }}
          />
        </FieldGroup>
      </div>

      <div id="form_footer" className="space-y-4">
        <ParagraphText className="text-sm">
          Already have an account?{' '}
          <LinkText href="/auth/login" prefetch>
            go to login page.
          </LinkText>
          <br />
          Forget your password?{' '}
          <LinkText href="/auth/forget" prefetch>
            reset your password.
          </LinkText>
        </ParagraphText>
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={disableInteraction}>
            <ChevronLeftIcon />
            Back
          </Button>
          <Button type="submit" disabled={disableInteraction}>
            {disableInteraction ? <Spinner /> : <LogInIcon />}
            Create Account
          </Button>
        </div>
      </div>
    </form>
  );
}
