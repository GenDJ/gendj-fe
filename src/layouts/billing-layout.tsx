import * as React from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';

export default function BillingLayout() {
  const { userId, isLoaded } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isLoaded && !userId) {
      navigate('/');
    }
  }, []);

  if (!isLoaded || !userId) return 'Loading...';
  return <Outlet />;
}
