import { useState, useEffect } from 'react';
import useAuthenticatedFetch from '#root/src/hooks/useAuthenticatedFetch';
import { useAuth } from '@clerk/clerk-react';
import { createFullEndpoint } from '#root/utils/apiUtils.ts';
import { useLocation } from 'react-router-dom';
import { formatTimeBalance } from '#root/utils/formattingUtils';

export default function BillingPage() {
  const { userId, isLoaded } = useAuth();
  const { entities, error, isLoading } = useAuthenticatedFetch(
    isLoaded && userId ? `users/${userId}` : null,
  );
  const { getToken } = useAuth();

  const user = entities?.users?.[0];

  type Pack = {
    hours: number;
    price: number;
    label: string;
    planTitle: string;
    pitch: string;
  };

  const packs: Pack[] = [
    {
      hours: 1,
      price: 500,
      label: '1 hour ($5)',
      planTitle: 'For fun',
      pitch: 'Just to have fun warping',
    },
    {
      hours: 10,
      price: 2000,
      label: '10 hours ($20)',
      planTitle: 'Creator',
      pitch: 'For content creators looking to make some real-time AI content',
    },
    {
      hours: 100,
      price: 10000,
      label: '100 hours ($100)',
      planTitle: 'Vtuber',
      pitch: 'For vtubers looking to use real-time AI for their content',
    },
  ];

  const [timeBalance, setTimeBalance] = useState(0);
  const [selectedPack, setSelectedPack] = useState(packs[1]);
  const [message, setMessage] = useState('');

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const queryStatus = queryParams.get('status');

  useEffect(() => {
    const userTimeBalance = user?.timeBalance || 0;
    setTimeBalance(userTimeBalance);
  }, [user?.timeBalance]);

  useEffect(() => {
    if (queryStatus === 'success') {
      setMessage(
        'Payment successful. Your time balance should update shortly and should be reflected after refreshing the page.',
      );
    }
  }, [queryStatus]);

  const handlePackSelection = (pack: Pack) => {
    setSelectedPack(pack);
  };

  const handlePurchase = async () => {
    if (!selectedPack) {
      alert('Please select a pack');
      return;
    }

    try {
      const token = await getToken();

      const response = await fetch(
        createFullEndpoint('payments/create-checkout-session'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            amount: selectedPack.price,
            userId,
            quantity: selectedPack.hours,
          }),
        },
      );

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      console.log('data1212', data);

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      console.error('Failed to create checkout session', error);
    }
  };

  return isLoaded && user ? (
    <div className="flex flex-col items-center min-h-screen bg-gray-900 pt-8 px-4 sm:px-6 lg:px-8">
      {message && (
        <div className="bg-green-600 text-white p-4 rounded-lg mb-6 max-w-md w-full text-center animate-fadeIn">
          {message}
        </div>
      )}
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-gray-100 mb-2">
          Remaining Time
        </h2>
        <div className="text-3xl font-semibold text-blue-400">
          {formatTimeBalance(timeBalance)}
        </div>
      </div>
      <div className="bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-4xl text-white">
        <div>
          <button
            className="w-full mb-8 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg px-4 py-3 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handlePurchase}
            disabled={!selectedPack}
          >
            Purchase Selected Pack
          </button>
          <h2 className="text-2xl font-bold text-gray-100 mb-4 text-center">
            Purchase Render Time
          </h2>
          <p className="text-gray-300 text-center mb-6">
            Purchase render time to use the AI in real-time. The time is
            deducted as you use the AI.
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {packs.map(pack => (
              <div
                key={pack.hours}
                className={`flex flex-col bg-gray-700 rounded-lg p-4${
                  selectedPack?.hours === pack?.hours ? ' bg-gray-900' : ''
                }`}
              >
                <button
                  className={`flex items-center justify-center rounded-lg transition-colors duration-200 ${
                    selectedPack?.hours === pack?.hours
                      ? 'bg-blue-900'
                      : 'bg-blue-500'
                  } text-white px-4 py-3 mb-4`}
                  onClick={() => handlePackSelection(pack)}
                >
                  {pack.label}
                </button>
                <div className="text-center flex-grow">
                  <div className="font-semibold text-gray-100 text-lg mb-2">
                    {pack.planTitle}
                  </div>
                  <div className="text-sm text-gray-300">{pack.pitch}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div>Loading...</div>
  );
}
