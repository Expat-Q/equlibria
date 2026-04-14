import { useCallback } from 'react';
import { usePrivy } from './privy';

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

export function useAuthFetch() {
  const { getAccessToken } = usePrivy();

  return useCallback(
    async (input: FetchInput, init: FetchInit = {}) => {
      const token = await getAccessToken();
      const headers = new Headers(init.headers || {});
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return fetch(input, { ...init, headers });
    },
    [getAccessToken]
  );
}
