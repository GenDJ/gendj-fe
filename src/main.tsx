import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import the layouts
import RootLayout from './layouts/root-layout';
import BillingLayout from '#root/src/layouts/billing-layout';
// Import the components
import IndexPage from './routes';
import MidiStuffPage from './components/MidiStuff';

import SignInPage from './routes/sign-in';
import SignUpPage from './routes/sign-up';
import BillingPage from './routes/billing';

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <IndexPage /> },
      { path: '/midistuff', element: <MidiStuffPage /> },
      { path: '/sign-in', element: <SignInPage /> },
      { path: '/sign-up', element: <SignUpPage /> },
      {
        path: '/billing',
        element: <BillingLayout />,
        children: [{ path: '', element: <BillingPage /> }],
      },
    ],
  },
]);
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>,
);
