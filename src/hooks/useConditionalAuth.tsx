import { useAuth } from '@clerk/clerk-react';
import { IS_WARP_LOCAL } from '#root/utils/constants.ts';

export default function useConditionalAuth() {
  if (!IS_WARP_LOCAL) {
    const { getToken, isLoaded } = useAuth();
    return { getToken, isLoaded };
  }

  return { getToken: null, isLoaded: null };
}
