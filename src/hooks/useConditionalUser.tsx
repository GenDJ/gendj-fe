import { useUser } from '@clerk/clerk-react';
import { IS_WARP_LOCAL } from '#root/utils/constants.ts';

export default function useConditionalUser() {
  if (!IS_WARP_LOCAL) {
    const { user, isLoaded } = useUser();
    return { user, isLoaded };
  }

  return { user: null, isLoaded: null };
}
