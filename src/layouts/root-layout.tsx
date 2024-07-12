import { Link, Outlet, useNavigate } from 'react-router-dom';
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  UserButton,
  useAuth,
} from '@clerk/clerk-react';
import { useEffect, useState } from 'react';
import useAnalytics from '#root/src/hooks/useAnalytics';
import { gaInit } from '#root/utils/ga4';
import { useDetectAdBlock } from 'adblock-detect-react';
import { IS_WARP_LOCAL } from '#root/utils/constants.ts';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY && IS_WARP_LOCAL) {
  throw new Error('Missing Publishable Key');
}

function GaInitComponent() {
  const { userId, isLoaded } = useAuth();
  const adBlockDetected = useDetectAdBlock();

  useEffect(() => {
    if (userId && !adBlockDetected) {
      console.log('gainituser1212', userId);
      gaInit(userId);
    }
  }, [userId]);

  return null;
}

export default function RootLayout() {
  const navigate = useNavigate();
  useAnalytics();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const renderContent = () => (
    <div className="min-h-screen bg-stone-900 text-white flex flex-col">
      <header className="font-open-sans w-full bg-stone-800 p-2 md:p-4 flex flex-row justify-between items-center">
        <nav className="flex items-center justify-start">
          <Link to="/" className="hover:text-gray-300 transition-colors">
            GenDJ
          </Link>
        </nav>
        <nav className="flex items-center justify-end space-x-4">
          <Link
            to="/billing"
            className="block md:inline-block hover:text-gray-300 transition-colors text-sm md:text-base"
          >
            Billing
          </Link>

          <a
            href="https://github.com/GenDJ"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-300 transition-colors text-sm md:text-base"
          >
            Open Source
          </a>
          <a
            href="https://discord.gg/CQfEpE76s5"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-300 transition-colors text-sm md:text-base"
          >
            Discord
          </a>
          {!IS_WARP_LOCAL && (
            <div className="text-white md:block">
              <UserButton afterSignOutUrl="/sign-in" />
            </div>
          )}
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );

  if (IS_WARP_LOCAL) {
    return renderContent();
  }

  return (
    <ClerkProvider navigate={navigate} publishableKey={PUBLISHABLE_KEY}>
      <div className="min-h-screen bg-stone-900 text-white flex flex-col">
        <SignedIn>
          {!IS_WARP_LOCAL && <GaInitComponent />}

          {renderContent()}
        </SignedIn>
        <SignedOut>
          <header
            className="font-open-sans w-full bg-stone-800 p-2 md:p-4 flex flex-row justify-between items-center"
            style={{ position: 'fixed' }}
          >
            <nav className="flex justify-start">
              <Link to="/" className="hover:text-gray-300 transition-colors">
                GenDJ
              </Link>
            </nav>
            <nav className="flex justify-end space-x-4">
              <a
                href="https://github.com/GenDJ"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-300 transition-colors"
              >
                Open Source
              </a>
              <a
                href="https://discord.gg/CQfEpE76s5"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-300 transition-colors"
              >
                Discord
              </a>
            </nav>
          </header>
          <main className="pt-16">
            <Outlet />
          </main>
        </SignedOut>
      </div>
    </ClerkProvider>
  );
}
