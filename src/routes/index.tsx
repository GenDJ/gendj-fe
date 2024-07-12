import { useEffect } from 'react';
import { SignedOut, SignedIn, useUser } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import useAuthenticatedFetch from '#root/src/hooks/useAuthenticatedFetch';
import videoFile from '#root/src/assets/gdjhomepage2.mov';
import WarpPage from '#root/src/components/WarpPage';
import useConditionalUser from '../hooks/useConditionalUser';
import { IS_WARP_LOCAL } from '#root/utils/constants.ts';
const VideoComponent = () => (
  <video
    className="rounded-lg"
    src={videoFile}
    controls
    loop
    autoPlay
    muted
    webkit-playsinline="true"
    playsInline={true}
    x5-playsinline="true"
    x-webkit-airplay="allow"
  />
);

export default function IndexPage() {
  const { isLoaded, user } = useConditionalUser();
  const userId = user?.id;
  const {
    entities: userData,
    error: userError,
    isLoading: userIsLoading,
    refetch,
  } = useAuthenticatedFetch(
    isLoaded && userId && !IS_WARP_LOCAL ? `users/${userId}` : null,
  );
  const dbUser = userData?.users?.[0];

  useEffect(() => {
    if (isLoaded && userId && userData && !dbUser && !IS_WARP_LOCAL) {
      const intervalId = setInterval(() => {
        console.log('refetching1212');
        refetch();
      }, 1000);

      return () => clearInterval(intervalId);
    }
  }, [isLoaded, userId, userData, dbUser, refetch]);

  console.log('dbUser1212', userId, dbUser, isLoaded);

  if (IS_WARP_LOCAL) {
    return (
      <div className="flex justify-center items-center">
        <div className="flex flex-col justify-center">
          <WarpPage dbUser={dbUser} />
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-center items-center">
      <SignedIn>
        <div className="flex flex-col justify-center">
          {dbUser && dbUser.timeBalance <= 0 && (
            <div className="text-center justify-center items-center p-8">
              <p className="mb-4">
                You currently have no balance. You can purchase credit on the
                billing page
              </p>
              <Link
                to="/billing"
                className="bg-blue-500 mt-4 text-white font-medium py-2 px-4 rounded hover:bg-blue-700 transition-colors duration-200"
              >
                Billing
              </Link>
            </div>
          )}
          {dbUser && dbUser.timeBalance > 0 && <WarpPage dbUser={dbUser} />}
        </div>
      </SignedIn>
      <SignedOut>
        <div className="font-open-sans justify-center items-center p-4 md:p-8 max-w-screen-lg">
          <div className="flex flex-col md:flex-row">
            <div className="text-center md:text-left w-full md:w-2/3 md:pr-24 pr-4">
              <p className="text-5xl md:text-6xl mb-4 md:mb-6">
                Warp your phone camera or webcam live with AI
              </p>
              <p className="text-md md:text-xl mb-2 md:mb-4 text-stone-300">
                Type in how you want to be warped and see yourself transform in
                real-time.
              </p>
              <p className="text-md md:text-xl mb-2 md:mb-4 text-stone-300">
                First 5 minutes are free to try it out!
              </p>
              <div className="my-10 md:my-10">
                <Link
                  className="inline-block text-white text-4xl font-semibold bg-gradient-to-b from-blue-500 to-blue-600 py-3 px-6 rounded-md hover:from-blue-600 hover:to-blue-700 transition-all duration-200 ease-in-out shadow-[0_4px_0_rgb(37,99,235)] hover:shadow-[0_2px_0_rgb(37,99,235)] hover:translate-y-0.5 active:shadow-none active:translate-y-1 cursor-pointer"
                  to="/sign-up"
                >
                  Start Warping
                </Link>
              </div>
            </div>
            <div className="w-full md:w-1/3 flex justify-center md:block">
              <VideoComponent />
            </div>
          </div>
        </div>
      </SignedOut>
    </div>
  );
}
