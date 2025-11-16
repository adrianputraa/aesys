'use client';

import { parseApiError } from '@/lib/helpers/query';
import { toast } from 'sonner';

const showToast = (callbackFn: () => any, id: string = 'toast') => {
  toast.promise(callbackFn, {
    id,
    success: 'Successfully saved',
    loading: 'Loading...',
    error: (err) => 'Failed to save: ' + parseApiError(err),
  });
};

export { showToast };
