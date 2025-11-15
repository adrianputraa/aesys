import { NextRequest, NextResponse } from 'next/server';

const GENERIC_MESSAGE = [
  { code: 500, message: 'Internal server error.' },
  { code: 403, message: 'Unauthorized.' },
  { code: 401, message: 'Not permitted.' },
  { code: 400, message: 'Bad request.' },
  { code: 200, message: 'Successful.' },
] as const;

type ApiResponse<T> = {
  code: number;
  message: string;
  data: T | null;
};

async function sendApiResponse<T>(code: number, data: T | null = null, message?: string): Promise<NextResponse> {
  const genericMessage = GENERIC_MESSAGE.find((res) => res.code === code)?.message ?? 'Unknown Response';
  const responsePayload = {
    code,
    message: message ?? genericMessage,
    data: data ?? null,
  } satisfies ApiResponse<T>;

  return NextResponse.json(responsePayload, {
    status: code,
    statusText: message ?? genericMessage,
  });
}

async function getApiPostBody<T>(req: NextRequest): Promise<T | undefined> {
  try {
    const body = (await req.json()) as T | undefined;
    return body;
  } catch (error) {
    return undefined;
  }
}

async function handleFetch<T>(url: string, options: RequestInit): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, options);

    if (!res || !res.ok || res.status > 200) {
      console.error('Error while fetching.', res.status, res.statusText);

      const errorResult = {
        code: res.status,
        message: res.statusText,
        data: null,
      } satisfies ApiResponse<T>;

      // Throw the object as an error
      throw errorResult;
    }

    const body = (await res.json()) as ApiResponse<T>;
    return body;
  } catch (error) {
    console.error(error);

    // If it's already an ApiResponse object, rethrow it
    if (typeof error === 'object' && error !== null && 'code' in error && 'message' in error) {
      return error as ApiResponse<T>;
    }

    // Otherwise, fallback to a client-side error
    return {
      code: 500,
      message: 'Client-side error',
      data: null,
    } satisfies ApiResponse<T>;
  }
}

export { getApiPostBody, sendApiResponse, handleFetch };
export type { ApiResponse };
