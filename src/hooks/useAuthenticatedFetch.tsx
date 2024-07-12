import { useAuth, useUser } from '@clerk/clerk-react';
import {
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from '@tanstack/react-query';
import { createFullEndpoint } from '#root/utils/apiUtils';
import useConditionalAuth from '#root/src/hooks/useConditionalAuth';
import useConditionalUser from '#root/src/hooks/useConditionalUser';

export default function useAuthenticatedFetch<TData = unknown, TError = Error>(
  endpoint: string | null,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>,
) {
  const { getToken, isLoaded } = useConditionalAuth();
  const { user } = useConditionalUser();
  const queryClient = useQueryClient();

  const fetchEntities = async () => {
    if (!endpoint || !isLoaded) return;

    const token = await getToken();
    const response = await fetch(createFullEndpoint(endpoint as string), {
      method: 'GET',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const { entities } = await response.json();
      return entities;
    } else {
      throw new Error('Request failed with status: ' + response.status);
    }
  };

  const queryKey = ['entities', endpoint, user?.id];

  const {
    data: entities,
    error,
    isLoading,
    refetch,
  } = useQuery<TData, TError>({
    queryKey,
    queryFn: fetchEntities,
    enabled: !!endpoint && isLoaded,
    ...options,
  });

  const cancel = () => queryClient.cancelQueries({ queryKey });

  return { entities, error, isLoading, refetch, cancel };
}
