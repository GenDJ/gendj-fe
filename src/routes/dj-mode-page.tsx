import { useEffect } from 'react';
import { SignedOut, SignedIn, useUser } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import useAuthenticatedFetch from '#root/src/hooks/useAuthenticatedFetch';
import videoFile from '#root/src/assets/gdjhomepage2.mov';
import DJModeInterface from '../components/DJModeInterface';

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

export default function DJModePage() {
  const { isLoaded, user } = useUser();
  const userId = user?.id;
  const {
    entities: userData,
    error: userError,
    isLoading: userIsLoading,
    refetch,
  } = useAuthenticatedFetch(isLoaded && userId ? `users/${userId}` : null);
  const dbUser = userData?.users?.[0];

  useEffect(() => {
    if (isLoaded && userId && userData && !dbUser) {
      const intervalId = setInterval(() => {
        console.log('refetching1212');
        refetch();
      }, 1000);

      return () => clearInterval(intervalId);
    }
  }, [isLoaded, userId, userData, dbUser, refetch]);

  console.log('dbUser1212', userId, dbUser, isLoaded);
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
          {dbUser && dbUser.timeBalance > 0 && (
            <DJModeInterface dbUser={dbUser} />
          )}
        </div>
      </SignedIn>
    </div>
  );
}
