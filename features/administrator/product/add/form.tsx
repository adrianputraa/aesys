'use client';

import { showToast } from '@/components/toast/saving';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { AddProductSchema, addProductSchema } from './product';
import { handleFetch } from '@/lib/api';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import {
  ArchiveIcon,
  BarcodeIcon,
  BoxesIcon,
  ChevronLeftIcon,
  DollarSignIcon,
  PencilIcon,
  PencilLineIcon,
  PlusIcon,
  ScrollTextIcon,
  SendIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { InputGroupTextarea } from '@/components/ui/input-group';
import { formatNumber } from '@/lib/helpers/number';
import { useProductCategoryQuery } from '../query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { AddProductCategoryDialog } from '@/components/dialog/add-category';
import { Fragment, useState } from 'react';
import { api, invalidateQuery } from '@/lib/helpers/query';

export default function AddProductForm() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(addProductSchema),
    defaultValues: {
      name: '',
      description: '',
      price: '0',
      stock: 0,
      sku: null,
      barcode: null,
      status: 'ACTIVE',
      categoryId: null,
    },
  });

  const { data: productCategory, isPending: productCategoryPending } = useProductCategoryQuery();
  const { mutateAsync: formAction, isPending } = useMutation({
    mutationFn: async (payload: AddProductSchema) => {
      const { data } = await api.post<Product[]>('/api/products', payload);
      return data;
    },
    onSuccess: (data) => {
      if (data && data.length > 0) {
        const product = data.at(0);

        if (!product) {
          // Fallback to admin page.
          router.push(`/admin`);
        } else {
          router.push(`/admin/product/${product.id}`);
        }
      }

      invalidateQuery(queryClient, 'product');
      form.reset();
    },
    onError: (error) => {
      console.error(error);
    },
  });

  const [openAddCategory, setOpenAddCategory] = useState(false);
  const disableInteraction = isPending;
  const watchDesc = form.watch('description');
  const watchPrice = form.watch('price');

  const onBack = () => {
    router.back();
  };

  const onSubmit = (value: AddProductSchema) => {
    showToast(() => formAction(value), 'add_product');
  };

  return (
    <Fragment>
      <form id="addProductForm" onSubmit={form.handleSubmit(onSubmit)} className="max-w-xl space-y-2">
        <div id="form_head" className="hidden">
          <p className="font-semibold text-xl text-foreground">Login</p>
          <p className="text-muted-foreground">Login to access more features</p>
        </div>

        <div id="form_body" className="space-y-2">
          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => {
                const { invalid: isInvalid } = fieldState;

                return (
                  <Field data-invalid={isInvalid} aria-disabled={disableInteraction}>
                    <FieldLabel htmlFor="formInputName" className="hidden">
                      Product Name
                    </FieldLabel>
                    <InputGroup className={cn({ 'text-red-600!': isInvalid })} aria-disabled={disableInteraction}>
                      <InputGroupAddon align="block-start">
                        <PencilIcon />
                        <InputGroupText>Product Name</InputGroupText>
                        {isInvalid && <FieldError errors={[fieldState.error]} />}
                      </InputGroupAddon>
                      <InputGroupInput
                        {...field}
                        id="formInputName"
                        autoComplete="off"
                        placeholder="Enter product name"
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
              name="description"
              control={form.control}
              render={({ field, fieldState }) => {
                const { invalid: isInvalid } = fieldState;

                return (
                  <Field data-invalid={isInvalid} aria-disabled={disableInteraction}>
                    <FieldLabel htmlFor="formInputDescription" className="hidden">
                      Description
                    </FieldLabel>
                    <InputGroup aria-disabled={disableInteraction}>
                      <InputGroupAddon align="block-start">
                        <PencilLineIcon />
                        <InputGroupText>Product Description</InputGroupText>
                        {isInvalid && <FieldError errors={[fieldState.error]} />}
                        <InputGroupText className="ml-auto">{watchDesc.length} / 1000</InputGroupText>
                      </InputGroupAddon>
                      <div className="w-full inline-flex">
                        <InputGroupTextarea
                          {...field}
                          id="formInputDescription"
                          placeholder="Enter product description"
                          className="min-h-48 resize"
                          aria-invalid={isInvalid}
                          aria-disabled={disableInteraction}
                          disabled={disableInteraction}
                        />
                      </div>
                    </InputGroup>
                  </Field>
                );
              }}
            />
          </FieldGroup>

          <FieldGroup>
            <Controller
              name="categoryId"
              control={form.control}
              render={({ field, fieldState }) => {
                const { invalid: isInvalid } = fieldState;

                return (
                  <Field data-invalid={isInvalid} aria-disabled={disableInteraction}>
                    <FieldLabel htmlFor="formCategoryId" className="hidden">
                      Product Category
                    </FieldLabel>
                    <InputGroup aria-disabled={disableInteraction}>
                      <InputGroupAddon align="block-start">
                        <ArchiveIcon />
                        <InputGroupText>Product Category</InputGroupText>
                        {isInvalid && <FieldError errors={[fieldState.error]} />}

                        <div className="ml-auto" />
                        <InputGroupButton
                          variant="default"
                          size="xs"
                          onClick={() => setOpenAddCategory(!openAddCategory)}
                        >
                          <PlusIcon />
                          New Category
                        </InputGroupButton>
                      </InputGroupAddon>
                      <Select
                        value={field.value ? String(field.value) : undefined}
                        onValueChange={(value) => {
                          const id = Number(value);
                          field.onChange(id);
                        }}
                      >
                        <SelectTrigger className="w-full border-none shadow-none">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {productCategoryPending ? (
                            <SelectItem value="0" disabled>
                              <Spinner />
                            </SelectItem>
                          ) : productCategory && productCategory.length > 0 ? (
                            productCategory.map((option, idx) => (
                              <SelectItem key={idx} value={String(option.id)}>
                                {option.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="0" disabled>
                              No category to select...
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </InputGroup>
                  </Field>
                );
              }}
            />
          </FieldGroup>

          <FieldGroup>
            <Controller
              name="price"
              control={form.control}
              render={({ field, fieldState }) => {
                const { invalid: isInvalid } = fieldState;

                return (
                  <Field data-invalid={isInvalid} aria-disabled={disableInteraction}>
                    <FieldLabel htmlFor="formProductPrice" className="hidden">
                      Price
                    </FieldLabel>
                    <InputGroup className={cn({ 'text-red-600!': isInvalid })} aria-disabled={disableInteraction}>
                      <InputGroupAddon align="block-start">
                        <DollarSignIcon />
                        <InputGroupText>Product Price</InputGroupText>
                        {isInvalid && <FieldError errors={[fieldState.error]} />}
                        <InputGroupText className="ml-auto">
                          <span className="mr-0.5">IDR</span>
                          {formatNumber(watchPrice)}
                        </InputGroupText>
                      </InputGroupAddon>

                      <InputGroupInput
                        {...field}
                        id="formProductPrice"
                        type="number"
                        autoComplete="off"
                        placeholder="Enter product price"
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
              name="stock"
              control={form.control}
              render={({ field, fieldState }) => {
                const { invalid: isInvalid } = fieldState;

                return (
                  <Field data-invalid={isInvalid} aria-disabled={disableInteraction}>
                    <FieldLabel htmlFor="formProductStock" className="hidden">
                      Stock
                    </FieldLabel>
                    <InputGroup className={cn({ 'text-red-600!': isInvalid })} aria-disabled={disableInteraction}>
                      <InputGroupAddon align="block-start">
                        <BoxesIcon />
                        <InputGroupText>Product Stock</InputGroupText>
                        {isInvalid && <FieldError errors={[fieldState.error]} />}
                      </InputGroupAddon>

                      <InputGroupInput
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        id="formProductStock"
                        type="number"
                        autoComplete="off"
                        placeholder="Enter product stock"
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

          <p className="text-muted-foreground">Optional Fields</p>

          <FieldGroup>
            <Controller
              name="sku"
              control={form.control}
              render={({ field, fieldState }) => {
                const { invalid: isInvalid } = fieldState;

                return (
                  <Field data-invalid={isInvalid} aria-disabled={disableInteraction}>
                    <FieldLabel htmlFor="formProductSku" className="hidden">
                      SKU
                    </FieldLabel>
                    <InputGroup className={cn({ 'text-red-600!': isInvalid })} aria-disabled={disableInteraction}>
                      <InputGroupAddon align="block-start">
                        <ScrollTextIcon />
                        <InputGroupText>SKU</InputGroupText>
                        {isInvalid && <FieldError errors={[fieldState.error]} />}
                      </InputGroupAddon>

                      <InputGroupInput
                        {...field}
                        id="formProductSku"
                        autoComplete="off"
                        placeholder="Enter product sku"
                        value={field.value ?? ''}
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
              name="barcode"
              control={form.control}
              render={({ field, fieldState }) => {
                const { invalid: isInvalid } = fieldState;

                return (
                  <Field data-invalid={isInvalid} aria-disabled={disableInteraction}>
                    <FieldLabel htmlFor="formProductBarcode" className="hidden">
                      Barcode
                    </FieldLabel>
                    <InputGroup className={cn({ 'text-red-600!': isInvalid })} aria-disabled={disableInteraction}>
                      <InputGroupAddon align="block-start">
                        <BarcodeIcon />
                        <InputGroupText>Barcode</InputGroupText>
                        {isInvalid && <FieldError errors={[fieldState.error]} />}
                      </InputGroupAddon>

                      <InputGroupInput
                        {...field}
                        id="formProductBarcode"
                        autoComplete="off"
                        placeholder="Enter product barcode"
                        value={field.value ?? ''}
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
        </div>

        <div id="form_footer" className="space-y-4">
          <div className="flex items-center justify-between">
            <Button type="button" variant="outline" onClick={onBack} disabled={disableInteraction}>
              <ChevronLeftIcon />
              Back
            </Button>
            <Button type="submit" disabled={disableInteraction}>
              {disableInteraction ? <Spinner /> : <SendIcon />}
              Save
            </Button>
          </div>
        </div>
      </form>

      <AddProductCategoryDialog
        open={openAddCategory}
        setOpen={setOpenAddCategory}
        onSuccessAction={() => {
          invalidateQuery(queryClient, ['productCategory']);
        }}
      >
        <span></span>
      </AddProductCategoryDialog>
    </Fragment>
  );
}
