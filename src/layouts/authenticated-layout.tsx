import * as React from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';

export default function AuthenticatedLayout() {
  const { userId, isLoaded } = useAuth();
  const navigate = useNavigate();
  console.log('billinglayout1212', userId, isLoaded);

  React.useEffect(() => {
    if (isLoaded && !userId) {
      navigate('/');
    }
  }, []);

  if (!isLoaded || !userId) return 'Loading...';
  return <Outlet />;
}
