import React from 'react';

const PendingModal: React.FC<{
  progress: number;
  handleClickEndWarp: () => void;
}> = ({ progress, handleClickEndWarp }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 text-gray-100 p-4 sm:p-8 rounded-xl shadow-2xl max-w-2xl w-full border border-gray-700">
        <h2 className="text-xl sm:text-3xl font-bold mb-3 sm:mb-6 text-blue-400 text-center">
          Starting up your private server
        </h2>
        <p className="text-sm sm:text-xl mb-3 sm:mb-6 text-gray-300">
          Realtime webcam warping requires significant computing power. Startup
          takes 1-5 minutes and WILL NOT be counted against your account warping
          time.
        </p>
        <p className="text-lg sm:text-2xl font-semibold mb-3 sm:mb-6 text-blue-300 text-center">
          In the meantime...
        </p>
        <ul className="space-y-3 sm:space-y-6 mb-4 sm:mb-8 text-sm sm:text-base">
          <li className="flex items-start">
            <svg
              className="w-4 h-4 sm:w-6 sm:h-6 text-blue-400 mr-2 mt-1 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span>
              Get ready to screen record. If you share cool videos with hashtag{' '}
              <span className="font-semibold">#GenDJ</span> on your socials and
              post the links in Discord I'll hook you up with free warping time
              credit
            </span>
          </li>
          <li className="flex items-start">
            <svg
              className="w-4 h-4 sm:w-6 sm:h-6 text-blue-400 mr-2 mt-1 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            <a
              href="https://discord.gg/CQfEpE76s5"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline hover:text-blue-300 transition-colors duration-300"
            >
              Join our Discord community
            </a>
          </li>
          <li className="flex items-start">
            <svg
              className="w-4 h-4 sm:w-6 sm:h-6 text-blue-400 mr-2 mt-1 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            <div>
              <span className="block mb-1 sm:mb-2">
                Follow @MrAssisted on social networks:
              </span>
              <div className="flex flex-wrap gap-2 sm:gap-4">
                {[
                  {
                    name: 'Instagram',
                    url: 'https://www.instagram.com/mrassisted',
                    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-12.5a4.51 4.51 0 0 0-4.5 4.5 4.51 4.51 0 0 0 4.5 4.5 4.51 4.51 0 0 0 4.5-4.5 4.51 4.51 0 0 0-4.5-4.5zm0 7.5a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm6-7.5h-1.5v-1.5h1.5v1.5z',
                  },
                  {
                    name: 'YouTube',
                    url: 'https://www.youtube.com/@mrassisted',
                    icon: 'M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z',
                  },
                  {
                    name: 'X',
                    url: 'https://twitter.com/mrassisted',
                    icon: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
                  },
                  {
                    name: 'TikTok',
                    url: 'https://www.tiktok.com/@mrassisted',
                    icon: 'M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
                  },
                ].map(platform => (
                  <a
                    key={platform.name}
                    href={platform.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors duration-300 flex items-center text-xs sm:text-sm"
                  >
                    <svg
                      className="w-4 h-4 sm:w-6 sm:h-6 mr-1"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d={platform.icon} />
                    </svg>
                    {platform.name}
                  </a>
                ))}
              </div>
            </div>
          </li>
        </ul>
        <div className="w-full bg-gray-700 rounded-full h-3 sm:h-4 mb-2 sm:mb-4">
          <div
            className="bg-blue-500 h-3 sm:h-4 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-center text-sm sm:text-lg font-semibold text-blue-300">
          Progress: {progress}%
          {progress === 100 && (
            <span className="block mt-1 sm:mt-2 text-xs sm:text-sm text-blue-400">
              Ok honestly that timing was a guess. If it's still loading please
              continue to wait, sorry.
            </span>
          )}
        </p>
        <div className="text-center my-4">
          <button
            onClick={handleClickEndWarp}
            className="bg-[#2c3e50] text-[#e0e0e0] border-none py-2 px-3 rounded-md cursor-pointer text-sm transition-all hover:bg-[#34495e] hover:-translate-y-0.5 active:translate-y-0"
          >
            Cancel starting the warp
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingModal;
