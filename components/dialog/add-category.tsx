'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { PlusIcon, SendIcon } from 'lucide-react';
import { Dispatch, SetStateAction, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { showToast } from '../toast/saving';
import z from 'zod';
import { Textarea } from '../ui/textarea';
import { Spinner } from '../ui/spinner';
import { api } from '@/lib/helpers/query';

interface Props {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  children?: React.ReactNode;
  onSuccessClose?: boolean;
  onSuccessAction?: () => void;
}

const addProductCategorySchema = z.object({
  name: z.string().min(1, 'Category must have a name.'),
  description: z.string().min(1, 'Category must have a description'),
});

type AddProductCategorySchema = z.infer<typeof addProductCategorySchema>;

export function AddProductCategoryDialog({ open, setOpen, onSuccessClose = true, ...props }: Props) {
  const form = useForm({
    resolver: zodResolver(addProductCategorySchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const { mutateAsync: formAction, isPending } = useMutation({
    mutationFn: async (payload: ProductCategoryQueryPost) => {
      const { data } = await api.post<ProductCategoryQueryResult[]>('/api/categories/product', payload);
      return data || [];
    },
    onSuccess: () => {
      if (props.onSuccessAction) {
        props.onSuccessAction();
      }

      if (onSuccessClose) {
        setOpen(false);
      }

      form.reset();
    },
    onError: (error) => {
      console.error(error);
    },
  });

  const onSubmit = async (value: AddProductCategorySchema) => {
    console.log('onSubmitAddCategory');
    showToast(() => formAction(value), 'add_category_form');
  };

  const onClose = () => {
    setOpen(!open);
  };

  const disableInteraction = isPending;
  const watchDesc = form.watch('description');

  useEffect(() => {
    form.reset();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {props.children ?? (
          <Button variant="outline">
            <PlusIcon />
            Add Category
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl md:max-h-[80svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add category</DialogTitle>
          <DialogDescription>Create a new category for a product</DialogDescription>
        </DialogHeader>

        <form id="addCategoryForm" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 p-1">
            <FieldGroup>
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => {
                  const { invalid: isInvalid } = fieldState;

                  return (
                    <Field data-invalid={isInvalid} aria-disabled={disableInteraction}>
                      <FieldLabel htmlFor="formInputName">Category Name</FieldLabel>
                      <Input
                        {...field}
                        id="formInputName"
                        autoComplete="off"
                        placeholder="Enter category name"
                        disabled={field.disabled || disableInteraction}
                        aria-invalid={isInvalid}
                        aria-disabled={disableInteraction}
                      />
                    </Field>
                  );
                }}
              />
            </FieldGroup>
            <FieldGroup>
              <Controller
                name="description"
                control={form.control}
                render={({ field, fieldState }) => {
                  const { invalid: isInvalid } = fieldState;

                  return (
                    <Field data-invalid={isInvalid} aria-disabled={disableInteraction}>
                      <FieldLabel htmlFor="formInputName">
                        Category Description
                        <span className="ml-auto">{watchDesc && watchDesc.length + ' Letters'}</span>
                      </FieldLabel>
                      <Textarea
                        {...field}
                        id="formInputName"
                        autoComplete="off"
                        placeholder="Enter category name"
                        className="max-h-[400px]"
                        disabled={field.disabled || disableInteraction}
                        aria-invalid={isInvalid}
                        aria-disabled={disableInteraction}
                      />
                    </Field>
                  );
                }}
              />
            </FieldGroup>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={disableInteraction}>
              Cancel
            </Button>

            <Button type="submit" disabled={disableInteraction}>
              {isPending ? <Spinner /> : <SendIcon />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
