import React from 'react';

// Simple SVG Spinner Component
const Spinner = () => (
  <svg
    className="animate-spin h-8 w-8 text-blue-400 mx-auto my-4"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

const PendingModal: React.FC<{
  handleClickEndWarp: () => void;
  isConnecting: boolean;
}> = ({ handleClickEndWarp, isConnecting }) => {
  const title = isConnecting ? 'Connecting to Warp...' : 'Warming Up Warp Engine...';
  const mainMessage = isConnecting
    ? 'Almost there! Establishing connection...'
    : 'Preparing your warp... (Usually under a minute)';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 text-gray-100 p-6 sm:p-8 rounded-xl shadow-2xl max-w-md w-full border border-gray-700 text-center">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 text-blue-400">
          {title}
        </h2>
        
        <Spinner />

        <p className="text-md sm:text-lg mb-6 text-gray-300">
          {mainMessage}
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <button
            onClick={handleClickEndWarp}
            className="bg-gray-600 hover:bg-gray-700 text-[#e0e0e0] border-none py-2 px-4 rounded-md cursor-pointer text-sm transition-all hover:-translate-y-0.5 active:translate-y-0 w-full sm:w-auto"
          >
            Cancel Warp
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingModal;
