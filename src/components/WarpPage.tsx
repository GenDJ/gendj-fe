import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createFullEndpoint } from '#root/utils/apiUtils.ts';
import { ToastContainer, toast, Bounce, Id as ToastId } from 'react-toastify';
import PendingModal from '#root/src/components/PendingModal';
import { formatTimeBalance } from '#root/utils/formattingUtils';
import { IS_WARP_LOCAL } from '#root/utils/constants.ts';
import useConditionalAuth from '#root/src/hooks/useConditionalAuth';
import MidiStuffPage from '#root/src/components/MidiStuff';
import 'image-capture';

import 'react-toastify/dist/ReactToastify.css';

// Define Warp interface based on new structure
interface Warp {
  id: string;
  jobId: string;
  jobStatus: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | string; // Allow string for potential other statuses
  jobRequestedAt?: string; // Assuming ISO string format
  jobStartedAt?: string; // Assuming ISO string format
  jobEndedAt?: string; // Assuming ISO string format
  workerId?: string;
  estimatedUserTimeBalance?: number;
  // Keep old fields potentially for historical data, but mark as optional/deprecated if needed
  podId?: string;
  podStatus?: string;
  // ... any other potential old fields
}

const FRAME_WIDTH = 512;
const FRAME_HEIGHT = 512;
const FRAME_RATE = 30;
const FRAME_DURATION = 1000 / FRAME_RATE;

interface Option {
  value: string;
  label: string;
}

// Rename and update URL builders
const buildWebsocketUrl = (workerId?: string) => {
  if (!workerId) return null; // Cannot build URL without workerId
  if (IS_WARP_LOCAL) {
    return `ws://localhost:8765`;
  } else {
    return `wss://${workerId}-8765.proxy.runpod.net`;
  }
};

const buildPromptEndpointUrl = (
  workerId?: string,
  promptIndex: number = 1,
) => {
  if (!workerId) return null; // Cannot build URL without workerId
  if (IS_WARP_LOCAL) {
    if (promptIndex === 1) {
      return `http://localhost:5556/prompt/`;
    } else {
      return `http://localhost:5556/secondprompt/`;
    }
  } else {
    if (promptIndex === 1) {
      return `https://${workerId}-5556.proxy.runpod.net/prompt/`;
    } else {
      return `https://${workerId}-5556.proxy.runpod.net/secondprompt/`;
    }
  }
};

const buildBlendEndpointUrl = (workerId?: string) => {
  if (!workerId) return null; // Cannot build URL without workerId
  if (IS_WARP_LOCAL) {
    return `http://localhost:5556/blend/`;
  } else {
    return `https://${workerId}-5556.proxy.runpod.net/blend/`;
  }
};

const promptLibraryOptions: Option[] = [
  { value: '', label: 'Select an art style...' },
  {
    value:
      'a super cool dj wearing headphones, rose tinted aviator sunglasses, disco colors vibrant indoors digital illustration HDR talking',
    label: 'DJ disco illustration',
  },
  {
    value:
      'an illustration of a cyborg, cyberpunk, futuristic, glowing eyes, hdr, ray tracing, bionic, metal skin, masterpiece, high resolution, computer generated',
    label: 'Cyberpunk mechanical person',
  },
  {
    value:
      'an illustration of a super happy very happy person smiling joyful joyous',
    label: 'Happy',
  },
  {
    value: 'an illustration of a sad super sad person tragic frowning saddest',
    label: 'Sad',
  },
  {
    value: 'an illustration of an old grey hair person super old aged oldest',
    label: 'Old',
  },
  {
    value:
      '8-bit 8bit pixel art, retro gaming style, vibrant colors, low resolution, blocky shapes, blocky',
    label: 'Pixel art',
  },
  {
    value:
      '8-bit pixel art of a medieval castle with dragons, retro gaming style, vibrant colors, low resolution, blocky shapes',
    label: 'Pixel art medieval castle',
  },
  {
    value:
      'a painting of waves, ocean waves, painted, brush strokes, painting, ocean, water, rich blue colors',
    label: 'Ocean waves',
  },
  {
    value:
      'Vaporwave aesthetic digital collage, retro 80s and 90s symbols, pastel colors, glitch effects, geometric shapes',
    label: 'Vaporwave digital collage',
  },
  {
    value:
      'an illustration of a marble statue, person made of marble, stone, carved, white marble',
    label: 'Marble statue',
  },
  {
    value:
      'Art Nouveau style illustration of a mermaid, flowing organic lines, pastel colors, intricate floral patterns, Alphonse Mucha inspired',
    label: 'Art Nouveau mermaid',
  },
  {
    value:
      'Isometric low-poly 3D render of a colorful candy world, pastel colors, geometric shapes, soft shadows, miniature scale',
    label: 'Low-poly candy world',
  },
  {
    value:
      'Dark gothic charcoal sketch of a haunted Victorian mansion, high contrast, rough textures, eerie atmosphere, Tim Burton inspired',
    label: 'Gothic charcoal haunted mansion',
  },
  {
    value:
      'Surrealist digital painting of impossible architecture, M.C. Escher inspired, optical illusions, muted colors, dreamlike quality',
    label: 'Surrealist impossible architecture',
  },
  {
    value:
      'an anime illustration of a magical character, soft pastel colors, dynamic pose, sparkles, magical, illustrated, anime, animated, drawn',
    label: 'Anime magic',
  },
  {
    value:
      'an illustration of a dog, dog, dog ears, whiskers, fur, colorful, doggy, puppy, dog face, a dog wearing glasses, fur, woof, barking, animal, canine, dog, illustrated dog, dog illustration',
    label: 'Doggy',
  },
];

const dropFrame =
  (n: number) =>
  (frameCounter: number): boolean => {
    return frameCounter === 0 || frameCounter === 1 || frameCounter % n !== 0;
  };

const dropFrameStrategies: Record<string, (frameCounter: number) => boolean> = {
  none: () => true,
  '2': dropFrame(2),
  '3': dropFrame(3),
  '4': dropFrame(4),
  '5': dropFrame(5),
};

// --- NEW: Warp Ended Modal Component --- 
const discordLink = 'https://discord.gg/CQfEpE76s5';
const shareUrl = 'https://gendj.com'; // Ensure this is the correct URL
const shareText = 'I warped myself with AI in real time on GenDJ.com #GenDJ';

interface WarpEndedModalProps {
  onClose: () => void;
}

const WarpEndedModal: React.FC<WarpEndedModalProps> = ({ onClose }) => {

  // Generate share URLs
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(shareText);

  const shareTargets = [
    {
      name: 'X (Twitter)',
      url: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      // Basic text button style
      className: 'bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded inline-flex items-center',
    },
    {
      name: 'Facebook',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
      className: 'bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-flex items-center',
    },
    {
      name: 'Reddit',
      url: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedText}`,
      className: 'bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded inline-flex items-center',
    },
    {
      name: 'Email',
      url: `mailto:?subject=${encodeURIComponent("Check out GenDJ!")}&body=${encodedText}%0A%0ACheck it out: ${encodedUrl}`,
      className: 'bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded inline-flex items-center',
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 text-gray-100 p-6 sm:p-8 rounded-xl shadow-2xl max-w-lg w-full border border-gray-700 text-center">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 text-green-400">
          Warp Session Ended
        </h2>
        
        <p className="text-md sm:text-lg mb-6 text-gray-300">
          Your warp session has successfully concluded. Thanks for using GenDJ!
        </p>

        {/* Share Section */}
        <p className="text-md font-semibold mb-4 text-blue-300">
          Spread the word!
        </p>
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          {shareTargets.map(target => (
            <a
              key={target.name}
              href={target.url}
              target="_blank"
              rel="noopener noreferrer"
              className={target.className}
            >
              {/* Optional: Add SVG icons here later if desired */}
              <span>Share on {target.name}</span>
            </a>
          ))}
        </div>

        {/* Discord Section */}
        <div className="border-t border-gray-700 my-6 pt-6">
           <p className="text-md font-semibold mb-4 text-blue-300">
              Join the Community:
           </p>
           <a
              href={discordLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
            >
               {/* Basic Discord SVG Icon */}
               <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 127.14 96.36" xmlns="http://www.w3.org/2000/svg"><path d="m107.7,8.07c-4.24-1.44-8.67-2.6-13.15-3.66-0.44-0.12-0.89-0.18-1.34-0.18-4.68,0.44-9.21,1.78-13.59,3.99-1.49,0.74-2.94,1.56-4.32,2.46-3.78,2.49-7.1,5.31-9.91,8.44-2.79-3.13-6.11-5.95-9.91-8.44-1.38-0.9-2.84-1.72-4.32-2.46-4.38-2.21-8.91-3.55-13.59-3.99-0.45,0-0.9,0.06-1.34,0.18-4.47,1.06-8.91,2.22-13.15,3.66-0.2,0.06-0.38,0.14-0.55,0.23-17.44,9.8-24.85,26.17-25.66,44.53-0.02,0.33-0.03,0.67-0.03,1.01,0,15.7,9.01,29.5,22.07,36.61,0.2,0.11,0.4,0.2,0.61,0.29,5.93,2.58,12.06,4.54,18.31,5.81,0.29,0.06,0.57,0.1,0.86,0.13,2.58,0.26,5.17,0.41,7.78,0.41,9.15,0,18.06-1.17,26.59-3.41,0.28-0.07,0.55-0.15,0.82-0.24,3.02-1.02,6-2.14,8.88-3.39,0.23-0.1,0.45-0.21,0.67-0.32,8.87-4.25,16.3-10.44,21.95-18.06,0.11-0.15,0.21-0.3,0.31-0.45,0.71-1.11,1.38-2.25,1.99-3.44,0.28-0.55,0.54-1.11,0.79-1.68,0.08-0.18,0.15-0.37,0.22-0.55,6.73-16.57,7.39-34.31-3.42-49.92-0.01-0.02-0.01-0.03-0.02-0.05zm-24.56,47.59c-3.33,0-6.03-2.7-6.03-6.03s2.7-6.03,6.03-6.03,6.03,2.7,6.03,6.03c0,3.33-2.7,6.03-6.03,6.03zm-32.51,0c-3.33,0-6.03-2.7-6.03-6.03s2.7-6.03,6.03-6.03,6.03,2.7,6.03,6.03c0,3.33-2.7,6.03-6.03,6.03z"/></svg>
              <span>Join Discord</span>
           </a>
        </div>

        {/* Close Button */}
        <div className="border-t border-gray-700 mt-6 pt-6">
           <button
             onClick={onClose}
             className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-md cursor-pointer transition-all duration-300"
           >
             Close
           </button>
        </div>

      </div>
    </div>
  );
};
// --- End Warp Ended Modal --- 

const GenDJ = ({ dbUser }: { dbUser: any }) => {
  const { getToken, isLoaded } = useConditionalAuth();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [prompt, setPrompt] = useState(
    'illustration of a dj sunglasses disco colors vibrant digital illustration HDR talking',
  );
  const [secondPrompt, setSecondPrompt] = useState('A psychedellic landscape.');
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [blendValue, setBlendValue] = useState(0); // ... other
  const [isFullBrowser, setIsFullBrowser] = useState(false);

  const [postText, setPostText] = useState('');
  const [isRendering, setIsRendering] = useState(false);
  const [isVideoFileMuted, setIsVideoFileMuted] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDJMode, setShowDJMode] = useState(false);
  const [isRenderSmooth, setIsRenderSmooth] = useState(false);
  const [dropEvery, setDropEvery] = useState<string>('none');

  const [calculatedFps, setcalculatedFps] = useState(0);
  const [warp, setWarp] = useState<Warp | null>(null);
  const [isPollingWarpStatus, setIsPollingWarpStatus] = useState(false);
  const [isConnectingWebSocket, setIsConnectingWebSocket] = useState(false);
  const [hasWebSocketConnectedOnce, setHasWebSocketConnectedOnce] = useState(false);
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);
  const [frameCount, setFrameCount] = useState(0);

  const [areWebcamPermissionsGranted, setAreWebcamPermissionsGranted] =
    useState(false);
  const [uiError, setUiError] = useState<null | string>(null);
  const [calcualatedTimeRemaining, setCalcualatedTimeRemaining] = useState<
    null | number
  >(null);
  const [isAudioLoopbackActive, setIsAudioLoopbackActive] = useState(false);

  const lastWarpedFrameRenderTimeRef = useRef<number | null>(null);
  const croppedCanvasRef = useRef<HTMLCanvasElement>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement>(null);
  const currentToastRef = useRef<ToastId | null>(null);
  const currentWarpRef = useRef(warp);
  const socketRef = useRef<WebSocket | null>(null);
  const dropEveryRef = useRef('none');
  const frameQueueRef = useRef<HTMLImageElement[]>([]);
  const frameTimestampsRef = useRef<number[]>([]);
  const isStreamingRef = useRef(false);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  const lastBlendSendTimeRef = useRef(0);
  const blendTimeoutIdRef = useRef<number | null>(null);

  const [isAudioLoopbackSupported, setIsAudioLoopbackSupported] =
    useState(true);

  // Ref to track initial mount for blendValue effect
  const isInitialBlendMount = useRef(true);

  const [isInitialWarpingLoading, setIsInitialWarpingLoading] = useState(false);
  const [hasClickedStartWarping, setHasClickedStartWarping] = useState(false);
  const [wasWarpInitiallyInProgress, setWasWarpInitiallyInProgress] = useState(false);
  const [, forceUpdate] = useState({});

  const [showWarpEndedModal, setShowWarpEndedModal] = useState(false); // Add state for the new modal

  // useEffect(() => {
  //   console.log('first prompt changed1212', prompt);
  // }, [prompt]);

  // useEffect(() => {
  //   console.log('second prompt changed1212', secondPrompt);
  // }, [secondPrompt]);

  // Looping checkbox handler

  const toggleFullBrowser = () => {
    setIsFullBrowser(prev => !prev);
  };

  const switchToNextDevice = useCallback(() => {
    const currentDeviceIndex = devices.findIndex(
      device => device.deviceId === selectedDeviceId,
    );
    const nextDeviceIndex = currentDeviceIndex + 1;
    const nextDevice = devices[nextDeviceIndex % devices.length];
    setSelectedDeviceId(nextDevice.deviceId);
    console.log(
      'switchToNextDevice1212',
      selectedDeviceId,
      currentDeviceIndex,
      nextDeviceIndex,
      devices,
    );
  }, [selectedDeviceId]);

  const switchToPreviousDevice = useCallback(() => {
    const currentDeviceIndex = devices.findIndex(
      device => device.deviceId === selectedDeviceId,
    );
    const previousDeviceIndex =
      (currentDeviceIndex - 1 + devices.length) % devices.length;
    const previousDevice = devices[previousDeviceIndex];
    setSelectedDeviceId(previousDevice.deviceId);
  }, [selectedDeviceId]);

  const checkAudioLoopbackSupport = async () => {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return false;
      }

      // Check if AudioContext is supported
      const AudioContext = window.AudioContext;
      if (!AudioContext) {
        return false;
      }

      // Try to get audio permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      // Create and close an AudioContext (some browsers only throw errors at this point)
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const destination = audioContext.destination;
      source.connect(destination);

      // Clean up
      stream.getTracks().forEach(track => track.stop());
      await audioContext.close();

      return true;
    } catch (error) {
      console.warn('Audio loopback not supported:', error);
      return false;
    }
  };

  useEffect(() => {
    console.log('set drop every1212', dropEvery);
    if (dropEvery) {
      dropEveryRef.current = dropEvery;
      localStorage.setItem('dropEvery', dropEvery);
    }
  }, [dropEvery]);

  useEffect(() => {
    if (localStorage.getItem('dropEvery')) {
      setDropEvery(localStorage.getItem('dropEvery') || 'none');
    }
  }, []);
  const toggleAudioLoopback = async () => {
    if (!isAudioLoopbackActive) {
      try {
        const checkSupport = async () => {
          const isSupported = await checkAudioLoopbackSupport();
          setIsAudioLoopbackSupported(isSupported);
        };

        checkSupport();
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('getUserMedia is not supported in this browser');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: selectedAudioDeviceId
              ? { exact: selectedAudioDeviceId }
              : undefined,
          },
        });
        audioStreamRef.current = stream;

        const AudioContext = window.AudioContext;
        if (!AudioContext) {
          throw new Error('AudioContext is not supported in this browser');
        }

        audioContextRef.current = new AudioContext();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        const destination = audioContextRef.current.destination;
        source.connect(destination);

        setIsAudioLoopbackActive(true);
      } catch (error) {
        console.error('Error setting up audio loopback:', error);
        alert(`Unable to start audio loopback: ${(error as Error).message}`);
      }
    } else {
      // If active, stop the loopback
      if (audioContextRef.current) {
        if (typeof audioContextRef.current.close === 'function') {
           audioContextRef.current.close();
        }
        audioContextRef.current = null;
      }
      if (audioStreamRef.current) {
        if (typeof audioStreamRef.current.getTracks === 'function') {
           audioStreamRef.current.getTracks().forEach(track => track.stop());
        }
        audioStreamRef.current = null;
      }
      setIsAudioLoopbackActive(false);
    }
  };

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
         if (typeof audioContextRef.current.close === 'function') {
            audioContextRef.current.close();
         }
      }
      if (audioStreamRef.current) {
         if (typeof audioStreamRef.current.getTracks === 'function') {
            audioStreamRef.current.getTracks().forEach(track => track.stop());
         }
      }
    };
  }, []);

  const showWarningToast = useCallback(() => {
    if (!currentToastRef.current) {
      const newToast = toast.warn('Having trouble connecting...', {
        position: 'bottom-right',
        autoClose: false,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: 'dark',
        transition: Bounce,
      });
      currentToastRef.current = newToast;
    }
  }, []);

  const showExplicitOrCopyrightedWarning = useCallback(() => {
    if (currentToastRef.current) {
      toast.dismiss(currentToastRef.current);
    }

    const newToast = toast.warn(
      'Explicit or copyrighted content is not permitted',
      {
        position: 'bottom-right',
        autoClose: false,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: 'dark',
        transition: Bounce,
      },
    );
    currentToastRef.current = newToast;
  }, []);

  useEffect(() => {
    currentWarpRef.current = warp;
  }, [warp]);

  useEffect(() => {
    if (selectedPrompt) {
      setPrompt(selectedPrompt);
    }
  }, [selectedPrompt]);

  const handleClickShowAdvanced = () => {
    setShowAdvanced(prev => !prev);
  };
  const handleClickShowDJMode = () => {
    setShowDJMode(prev => !prev);
  };

  //startVideoStream
  useEffect(() => {
    let streamToCleanUp: MediaStream | null = null;

    const initiateStream = async (deviceId: string | null) => {
      if (deviceId) {
        if (currentStream) {
          currentStream.getTracks().forEach(track => track.stop());
        }

        try {
          const nextStream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { exact: deviceId },
              width: { ideal: FRAME_WIDTH },
              height: { ideal: FRAME_HEIGHT },
            },
          });

          setCurrentStream(nextStream);
          streamToCleanUp = nextStream;
        } catch (error) {
          console.error('Error getting user media:', error);
        }
      }
    };

    initiateStream(selectedDeviceId);

    return () => {
      if (streamToCleanUp) {
        console.log('Cleaning up stream');
        streamToCleanUp.getTracks().forEach(track => track.stop());
      }
    };
  }, [selectedDeviceId]);

  useEffect(() => {
    if (uiError) {
      alert(uiError);
    }
  }, [uiError]);

  // Heartbeat Effect
  useEffect(() => {
    let heartbeatInterval: NodeJS.Timeout | null = null;

    const sendHeartbeat = async () => {
      if (IS_WARP_LOCAL || !warp?.id || !getToken) {
        return;
      }

      console.log("Sending heartbeat...");
      try {
        const token = await getToken();
        const response = await fetch(
          createFullEndpoint(`warps/${warp.id}/heartbeat`),
          {
            method: 'POST',
            // body: '{}', // Empty body is often implicit for POST, check if backend requires it
            headers: {
              Authorization: `Bearer ${token}`,
              credentials: 'include',
              'Content-Type': 'application/json', // Explicitly set Content-Type
            },
          },
        );

        if (response.ok) {
          const { estimatedUserTimeBalance } = await response.json();
          console.log("Heartbeat OK, time balance:", estimatedUserTimeBalance);
          if (estimatedUserTimeBalance !== undefined) { // Check for undefined, 0 is valid
            setCalcualatedTimeRemaining(estimatedUserTimeBalance);
          }
        } else if (response.status === 402) {
          console.warn('Heartbeat failed: 402 Payment Required (Out of Time)');
           setUiError('Your warp time has run out. The session has been stopped.');
           // Stop polling if it's somehow still active
           setIsPollingWarpStatus(false);
           // Update warp state to reflect it likely ended/cancelled
           // The exact status might come from the response body or we assume 'CANCELLED' / 'FAILED'
           setWarp(prevWarp => prevWarp ? { ...prevWarp, jobStatus: 'CANCELLED' } : null);
            // Close WebSocket connection
            if (socketRef.current) {
               console.log('Closing WebSocket due to out of time.');
               socketRef.current.close();
            }
            // Stop sending heartbeats
           if (heartbeatInterval) clearInterval(heartbeatInterval);
        } else {
          console.error(`Heartbeat failed with status: ${response.status}`);
          // Handle other errors? Maybe stop heartbeat after repeated failures?
        }
      } catch (error) {
        console.error('Error sending heartbeat fetch request:', error);
        // Handle fetch errors
      }
    };

    // Only run heartbeat when the warp is active
    if (warp?.jobStatus === 'IN_PROGRESS') {
      console.log('Warp IN_PROGRESS, starting heartbeat.');
      // Send immediate heartbeat, then set interval
      sendHeartbeat();
      heartbeatInterval = setInterval(sendHeartbeat, 30000); // Send every 30 seconds
    } else {
       console.log('Warp not IN_PROGRESS, stopping heartbeat.');
    }

    // Cleanup function
    return () => {
      if (heartbeatInterval) {
        console.log('Clearing heartbeat interval.');
        clearInterval(heartbeatInterval);
      }
    };
  // Depend on the status that indicates the warp is active and the warp ID
  }, [warp?.jobStatus, warp?.id, getToken]);

  useEffect(() => {
    const initializeWarp = async () => {
      console.log("Attempting to initialize warp...");
      if (!getToken) {
         console.error("Authentication function not available.");
         setUiError("Authentication error. Please refresh.");
         return;
      }
      const token = await getToken();
      let responseJson;
      let responseOk = false;

      try {
        const response = await fetch(createFullEndpoint(`warps`), {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        responseOk = response.ok;
        responseJson = await response.json();

        if (responseOk) {
          const { entities, estimatedUserTimeBalance } = responseJson;
          console.log('Initialize Response entities:', entities);
          const initialWarpData = entities?.warps?.[0];

          if (initialWarpData?.id && initialWarpData?.jobId) {
            // Set initial warp state (might be IN_QUEUE)
            setWarp(initialWarpData);
            if (estimatedUserTimeBalance) {
              setCalcualatedTimeRemaining(estimatedUserTimeBalance);
            }
            // If status is not IN_PROGRESS, start polling
            if (initialWarpData.jobStatus !== 'IN_PROGRESS') {
              console.log(`Warp status is ${initialWarpData.jobStatus}, starting polling.`);
              setIsPollingWarpStatus(true);
            } else {
               console.log(`Warp status is already ${initialWarpData.jobStatus}.`);
               // Mark that it was initially ready
               setWasWarpInitiallyInProgress(true);
            }
          } else {
            console.error('Initialization response missing id or jobId:', initialWarpData);
            setUiError('Failed to initialize warp session. Response missing necessary IDs.');
          }
        } else {
          console.error('Initialization request failed:', response.status, responseJson);
          const errorMessage = responseJson?.message || `HTTP error ${response.status}`;
          setUiError(
            `Request failed: ${errorMessage}. Contact support if the problem persists.`,
          );
        }
      } catch (error) {
         console.error('Error during warp initialization fetch:', error);
         const errorMessage = responseJson?.message || (error as Error).message || 'Network error or failed to parse response.';
          setUiError(
            `Error initializing: ${errorMessage}. Contact support if the problem persists.`,
          );
      }
    };

    const initializeLocal = () => {
      const localWarp: Warp = { // Use Warp interface
        id: 'local',
        jobId: 'local-job',
        jobStatus: 'IN_PROGRESS', // Assume local is always ready
        workerId: 'local-worker', // Provide a dummy workerId for local dev
      };
      setWarp(localWarp);
    };

    if (IS_WARP_LOCAL) {
      initializeLocal();
    } else if (!warp && isLoaded) { // Only initialize if warp is not set and auth is loaded
      initializeWarp();
    }

    checkWebcamPermissions();
  }, [isLoaded]); // Depend on isLoaded to ensure getToken is ready

  // Helper function to create a blank black JPEG blob
  const createBlankFrameBlob = (): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = FRAME_WIDTH;
      canvas.height = FRAME_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              // Fallback or error handling if blob creation fails
              resolve(new Blob()); 
            }
          },
          'image/jpeg',
          0.8 // Quality setting
        );
      } else {
         // Fallback or error handling if context fails
         resolve(new Blob());
      }
    });
  };

  // Function to send multiple blank frames
  const sendWarmupFrames = async (socket: WebSocket, count: number) => {
    console.log(`Sending ${count} warmup frames...`);
    const blankBlob = await createBlankFrameBlob();
    if (blankBlob.size > 0) { 
        for (let i = 0; i < count; i++) {
            if (socket.readyState === WebSocket.OPEN) {
                try {
                   const buffer = await blankBlob.arrayBuffer();
                   socket.send(buffer);
                   console.log(`Sent warmup frame ${i + 1}/${count}`);
                } catch (error) {
                    console.error(`Error sending warmup frame ${i+1}:`, error);
                    break; // Stop sending if one fails
                }
            } else {
                console.warn(`WebSocket closed before sending warmup frame ${i + 1}.`);
                break;
            }
            // Optional small delay between frames if needed
            // await new Promise(resolve => setTimeout(resolve, 10)); 
        }
         console.log("Warmup frames sent.");
    } else {
        console.error("Failed to create blank frame blob for warmup.");
    }
  };

  // Polling Effect for Warp Status
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;

    const pollWarpStatus = async () => {
      if (!warp?.id || !getToken) return; // Need warp ID and auth token function

      console.log(`Polling status for warp ID: ${warp.id}...`);
      try {
        const token = await getToken();
        const response = await fetch(createFullEndpoint(`warps/${warp.id}`), {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            credentials: 'include',
          },
        });

        if (response.ok) {
          const { entities, estimatedUserTimeBalance } = await response.json();
          const updatedWarp = entities?.warps?.[0] as Warp | undefined;

          if (updatedWarp) {
            console.log('Poll response:', updatedWarp);
            setWarp(updatedWarp); // Update the warp state with the latest data

            // Update time remaining if available
            if (estimatedUserTimeBalance) {
               setCalcualatedTimeRemaining(estimatedUserTimeBalance);
            }

            // Check the job status
            switch (updatedWarp.jobStatus) {
              case 'IN_PROGRESS':
                console.log('Warp is IN_PROGRESS. Stopping polling.');
                setIsPollingWarpStatus(false);
                // Initiate WebSocket connection phase
                setIsConnectingWebSocket(true);
                setHasWebSocketConnectedOnce(false); // Reset connection tracker
                break;
              case 'COMPLETED':
              case 'FAILED':
              case 'CANCELLED':
                console.log(`Warp reached terminal state: ${updatedWarp.jobStatus}. Stopping polling.`);
                setIsPollingWarpStatus(false);
                // Handle terminal state (e.g., show error message)
                 setUiError(`Warp session ended with status: ${updatedWarp.jobStatus}. Please refresh.`);
                 // Ensure connecting state is false if warp ends terminally
                 setIsConnectingWebSocket(false);
                 if (socketRef.current) {
                   socketRef.current.close();
                 }
                break;
              case 'IN_QUEUE':
                console.log('Warp is still IN_QUEUE. Continuing poll.');
                // Continue polling
                break;
              default:
                console.warn(`Unknown jobStatus received: ${updatedWarp.jobStatus}`);
                // Decide how to handle unknown states - continue or stop polling?
                break;
            }
          } else {
            console.error('Polling error: Warp data not found in response entities.');
             // Potentially stop polling if the warp disappears
             // setIsPollingWarpStatus(false);
             // setUiError('Warp session data lost during polling.');
          }
        } else {
          console.error('Polling request failed:', response.status);
          // Handle non-OK responses (e.g., 404 Not Found might mean the warp was deleted)
          if (response.status === 404) {
              console.error('Warp not found during polling. Stopping polling.');
              setIsPollingWarpStatus(false);
              setUiError('Warp session not found. It might have been deleted or expired.');
          } else {
             // Keep polling for other transient errors? Or stop after N failures?
             console.warn('Non-fatal polling error, will retry.');
          }
        }
      } catch (error) {
        console.error('Error during warp status polling fetch:', error);
         // Keep polling on network errors? Or stop after N failures?
         console.warn('Fetch error during polling, will retry.');
      }
    };

    if (isPollingWarpStatus && warp?.id) {
      // Start polling immediately and then set interval
      pollWarpStatus();
      pollInterval = setInterval(pollWarpStatus, 7000); // Poll every 7 seconds
    } else {
       console.log('Not polling or no warp ID yet.')
    }

    // Cleanup function
    return () => {
      if (pollInterval) {
        console.log('Clearing poll interval.');
        clearInterval(pollInterval);
      }
    };
  }, [isPollingWarpStatus, warp?.id, getToken]); // Re-run if polling is enabled/disabled or warp ID changes

  const renderFlash = () => {
    const now = Date.now();
    const fps = calculateFPS();
    setcalculatedFps(fps);
    const interval = fps > 0 ? 1000 / fps : 1000 / FRAME_RATE;
    const processedCanvas = processedCanvasRef.current;
    if (!processedCanvas) {
      console.log('no processed canvas1212');
      return;
    }

    const processedCtx = processedCanvas.getContext('2d');
    if (!processedCtx) {
      console.log('no processed ctx1212');
      return;
    }
    if (
      !lastWarpedFrameRenderTimeRef.current ||
      (frameQueueRef?.current?.length > 0 &&
        now - lastWarpedFrameRenderTimeRef.current >= interval) ||
      frameQueueRef?.current?.length > 8 ||
      (frameQueueRef?.current?.length > 0 &&
        now - lastWarpedFrameRenderTimeRef.current >= 1000)
    ) {
      if (frameQueueRef?.current?.length > 0) {
        const [img, ...remainingFrames] = frameQueueRef.current;
        frameQueueRef.current = remainingFrames;

        if (img) {
          processedCtx.drawImage(
            img,
            0,
            0,
            processedCanvas.width,
            processedCanvas.height,
          );
        } else {
          console.log('no image121222');
        }
        lastWarpedFrameRenderTimeRef.current = now;
      }
    }
    requestAnimationFrame(renderFlash);
  };

  const renderSmooth = () => {
    // Implementation of renderSmooth logic here...
  };

  const selectedRenderFunction = useRef<() => void>(renderFlash);

  useEffect(() => {
    if (areWebcamPermissionsGranted) {
      console.log('areWebcamPermissionsGranted12122');
      initializeWebcam();
      // fetchApiUrls();
    }
  }, [areWebcamPermissionsGranted]);

  useEffect(() => {
    selectedRenderFunction.current = isRenderSmooth
      ? renderSmooth
      : renderFlash;
  }, [isRenderSmooth]);

  //renderFrames
  useEffect(() => {
    if (isRendering) {
      console.log('isrendering1212', isRendering);
      selectedRenderFunction.current();
    } else {
      console.log(
        'not rendering1212',
        isRendering,
        frameQueueRef?.current?.length,
      );
    }
  }, [isRendering]);

  const checkWebcamPermissions = async () => {
    console.log('checkWebcamPermissions1212');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      console.log('Webcam permissions being set to granted1212');
      setAreWebcamPermissionsGranted(true);
    } catch (error) {
      console.error('Webcam permissions not granted:', error);
    }
  };

  const initializeWebcam = async () => {
    console.log('initializeWebcam1212');
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        device => device.kind === 'videoinput',
      );
      const audioInputDevices = devices.filter(
        device => device.kind === 'audioinput',
      );
      setDevices(videoDevices);
      setAudioDevices(audioInputDevices);

      if (videoDevices.length > 0) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
      if (audioInputDevices.length > 0) {
        setSelectedAudioDeviceId(audioInputDevices[0].deviceId);
      }
      if (!isRendering) {
        console.log('settingisrendering outside1212');
        setIsRendering(true);
      }
    } catch (error) {
      console.error('Error initializing devices:', error);
    }
  };

  function calculateFPS() {
    const now = Date.now();
    const cutoff = now - 1000;

    frameTimestampsRef.current = frameTimestampsRef.current.filter(
      timestamp => timestamp >= cutoff,
    );

    const frameTimestamps = frameTimestampsRef.current;

    return frameTimestamps.length;
  }

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullBrowser) {
        setIsFullBrowser(false);
      }
    };

    document.addEventListener('keydown', handleEscKey);

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isFullBrowser]);

  const sendPrompt = useCallback(
    (promptIndex = 1) => {
      if (!warp?.workerId) {
        console.error('Cannot send prompt: workerId not available.');
        toast.error('Warp is not ready yet.');
        return;
      }

      const promptEndpointUrl = buildPromptEndpointUrl(
        warp.workerId,
        promptIndex,
      );
      if (!promptEndpointUrl) {
        console.error('Failed to build prompt endpoint URL even with workerId.');
        return;
      }

      const encodedPrompt =
        promptIndex === 1
          ? encodeURIComponent(`${prompt} ${postText}`)
          : encodeURIComponent(`${secondPrompt} ${postText}`);
      const endpoint = `${promptEndpointUrl}${encodedPrompt}`;

      fetch(endpoint, {
        method: 'POST',
      })
        .then(response => response.text())
        .then(data => {
          console.log('promptData', data);
          try {
            if (data) {
              const parsedData = JSON.parse(data);
              if (parsedData?.safety === 'unsafe') {
                showExplicitOrCopyrightedWarning();
              }
            }
          } catch (error) {
            console.error('prompt parse error:', error);
          }
        })
        .catch(error => {
          console.error('Error:', error);
        });
    },
    [warp, prompt, postText, secondPrompt],
  );

  const sendBlendRequest = (value: number) => {
    if (!warp?.workerId) {
      console.error('Cannot send blend request: workerId not available.');
      return;
    }
    const blendEndpointUrl = buildBlendEndpointUrl(warp.workerId);
    if (!blendEndpointUrl) {
      console.error('Failed to build blend endpoint URL even with workerId.');
      return;
    }
    const endpoint = `${blendEndpointUrl}${value}`;

    fetch(endpoint, {
      method: 'POST',
    })
      .then(response => response.text())
      .then(data => {
        console.log('Blend response:', data);
      })
      .catch(error => {
        console.error('Error sending blend value:', error);
      });
  };

  const handleSliderChange = (value: number) => {
    console.log('hsc1212', value);
    const now = Date.now();
    if (now - lastBlendSendTimeRef.current >= 24) {
      sendBlendRequest(value);
      lastBlendSendTimeRef.current = now;
    } else {
      if (blendTimeoutIdRef.current !== null) window.clearTimeout(blendTimeoutIdRef.current);
      blendTimeoutIdRef.current = window.setTimeout(() => {
        sendBlendRequest(value);
        lastBlendSendTimeRef.current = Date.now();
      }, 60);
    }
  };

  useEffect(() => {
    // Prevent calling handler on initial mount
    if (isInitialBlendMount.current) {
      isInitialBlendMount.current = false;
    } else {
      handleSliderChange(blendValue);
    }

    return () => {
      if (blendTimeoutIdRef.current !== null) window.clearTimeout(blendTimeoutIdRef.current);
    };
  }, [blendValue]);

  const handleClickEndWarp = useCallback(() => {
    if (!warp?.id) {
      console.error('Warp id not currently set');
      return;
    }

    const endWarp = async () => {
      if (!getToken) {
         console.error("Authentication function not available.");
         setUiError("Authentication error. Please refresh.");
         return;
       }
      const token = await getToken();
      try {
         const response = await fetch(
           createFullEndpoint(`warps/${warp?.id}/end`),
           {
             method: 'POST',
             headers: {
               Authorization: `Bearer ${token}`,
               credentials: 'include',
             },
           },
         );

         if (response.ok) {
            const { entities } = await response.json();
            const updatedWarp = entities?.warps?.[0];
            console.log('settingendedwarp1212', updatedWarp);
            setWarp(updatedWarp); // Update local warp state
            setShowWarpEndedModal(true); // Show the modal on success
         } else {
            // Handle non-OK response from end warp endpoint
            console.error('Failed to end warp:', response.status, await response.text());
            setUiError('Failed to stop the warp session. Please try again or contact support.');
         }
      } catch (error) {
         console.error('Error calling end warp endpoint:', error);
         setUiError('An error occurred while trying to stop the warp session.');
      }
    };

    if (confirm('Are you sure you want to end the warp?')) {
      endWarp();
    }
  }, [warp?.id, getToken]); // Include getToken in dependencies

  //sendframes
  useEffect(() => {
    const videoTrack = currentStream?.getVideoTracks()?.[0];
    if (!videoTrack) {
      console.log('novideotrack1212');
      return;
    } else {
      console.log('yesvideotrack1212');
    }

    const imageCaptureInstance = new ImageCapture(videoTrack);

    if (!imageCaptureInstance) {
      console.log('outside no image capture instance1212');
      return;
    } else {
      console.log('outside yes image capture instance1212');
    }
    const croppedCanvas = croppedCanvasRef.current;
    if (!croppedCanvas) return;

    const croppedCtx = croppedCanvas.getContext('2d');
    if (!croppedCtx) return;

    let frameCounter = 0;
    let lastFrameTime = 0;
    const frameDuration = 1000 / FRAME_RATE;
    let animationFrameId: number | null = null;

    const sendFrame = async (currentTime: number) => {
      if (currentTime - lastFrameTime < frameDuration) {
        animationFrameId = requestAnimationFrame(sendFrame);
        return;
      }

      try {
        const video = videoRef.current;
        let frame,
          scaleWidth,
          scaleHeight,
          scale,
          scaledWidth,
          scaledHeight,
          dx,
          dy;

        if (video instanceof HTMLVideoElement) {
          frame = video;
          croppedCanvas.width = FRAME_WIDTH;
          croppedCanvas.height = FRAME_HEIGHT;

          scaleWidth = FRAME_WIDTH / video.videoWidth;
          scaleHeight = FRAME_HEIGHT / video.videoHeight;
          scale = Math.max(scaleWidth, scaleHeight); // Change min to max

          scaledWidth = video.videoWidth * scale;
          scaledHeight = video.videoHeight * scale;

          dx = (FRAME_WIDTH - scaledWidth) / 2;
          dy = (FRAME_HEIGHT - scaledHeight) / 2;
          croppedCtx.clearRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
          croppedCtx.drawImage(video, dx, dy, scaledWidth, scaledHeight);
        } else if (videoTrack.readyState === 'live') {
          if (!imageCaptureInstance) {
            console.log('no image capture instance1212');
            return;
          }

          frame = await imageCaptureInstance.grabFrame();

          croppedCanvas.width = FRAME_WIDTH;
          croppedCanvas.height = FRAME_HEIGHT;

          scaleWidth = FRAME_WIDTH / frame.width;
          scaleHeight = FRAME_HEIGHT / frame.height;
          scale = Math.min(scaleWidth, scaleHeight);

          scaledWidth = frame.width * scale;
          scaledHeight = frame.height * scale;

          dx = (FRAME_WIDTH - scaledWidth) / 2;
          dy = (FRAME_HEIGHT - scaledHeight) / 2;

          croppedCtx.clearRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
          croppedCtx.drawImage(frame, dx, dy, scaledWidth, scaledHeight);
        }

        croppedCanvas.toBlob(
          blob => {
            if (
              blob &&
              isStreamingRef.current &&
              socketRef?.current?.readyState === WebSocket.OPEN &&
              dropFrameStrategies[dropEveryRef.current](frameCounter)
            ) {
              blob.arrayBuffer().then(buffer => {
                if (socketRef?.current?.readyState === WebSocket.OPEN) {
                  // console.log('sending frame12122');
                  socketRef?.current?.send(buffer);
                }
              });
            }
            lastFrameTime = currentTime;
            animationFrameId = requestAnimationFrame(sendFrame);
            frameCounter++;
          },
          'image/jpeg',
          0.8,
        );
      } catch (error) {
        console.error('Error capturing frame:', error);
      }
    };

    console.log('kicking off');
    sendFrame(performance.now());

    // Cleanup function
    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [currentStream]);

  const toggleFullscreen = () => {
    const canvas = processedCanvasRef.current;
    if (!canvas) return;

    if (!document.fullscreenElement) {
      if (canvas.requestFullscreen) {
        canvas.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // WebSocket Connection Effect
  useEffect(() => {
    console.log(
      'WebSocket Effect Triggered. Status:',
       warp?.jobStatus,
       'WorkerID:',
       warp?.workerId
    );
    if (!warp?.id || warp.jobStatus !== 'IN_PROGRESS' || !warp.workerId) {
      console.log(
        'Conditions not met for WebSocket connection. Status:',
         warp?.jobStatus,
         'WorkerID:',
         warp?.workerId
      );
       // Ensure socket is closed if conditions are no longer met
       if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
         console.log('Closing WebSocket because conditions are no longer met.');
         socketRef.current.close();
       }
      return;
    }

    let newSocket: WebSocket | null = null;
    let connectAttemptTimeout: NodeJS.Timeout | null = null;
    let initialConnectTimeout: NodeJS.Timeout | null = null;

    const connectWebSocket = () => {
      // Check again right before connection attempt
      if (currentWarpRef.current?.jobStatus !== 'IN_PROGRESS' || !currentWarpRef.current?.workerId) {
          console.log("Aborting connection attempt as status/workerId changed.");
          return;
      }

      const websocketUrl = buildWebsocketUrl(currentWarpRef.current.workerId);
      if (!websocketUrl) {
        console.error('Cannot connect WebSocket: Worker ID not available to build URL.');
        return;
      }

      console.log(`Attempting to connect WebSocket to: ${websocketUrl}`);
      newSocket = new WebSocket(websocketUrl);
      socketRef.current = newSocket; // Assign immediately for potential cleanup

      newSocket.binaryType = 'arraybuffer';

      newSocket.onopen = () => {
        console.log('WebSocket connection openeddd');
        if (currentToastRef.current) {
          toast.dismiss(currentToastRef.current);
        }

        // Check if warm-up is needed
        if (wasWarpInitiallyInProgress) {
           console.log("Warp was initially IN_PROGRESS. Skipping warm-up frames.");
           // Connect immediately, no warm-up phase
           setIsConnectingWebSocket(false);
           setHasWebSocketConnectedOnce(true);
           setIsWarmingUp(false); // Ensure warming up state is false
        } else {
           console.log("Warp started during this session. Starting warm-up frames.");
           // Start warm-up phase
           setIsWarmingUp(true);
           if (newSocket) { 
             sendWarmupFrames(newSocket, 4);
           }
        }
      };

      newSocket.onmessage = event => {
        // Process the received frame normally
        const blob = new Blob([event.data], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);

        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          frameQueueRef.current = [...frameQueueRef.current, img];
          frameTimestampsRef.current = [
            ...frameTimestampsRef.current,
            Date.now(),
          ];
          // Increment frame count after successfully adding to queue
          setFrameCount(prev => prev + 1);
        };
        img.src = url;
      };

      newSocket.onclose = () => {
        // Use the ref to check the *current* intended status
        if (currentWarpRef.current?.jobStatus === 'IN_PROGRESS') {
          console.log(
            'WebSocket closed unexpectedly while warp should be IN_PROGRESS. Reconnecting...',
            currentWarpRef.current,
          );
          // Only show warning if it had previously connected
          if (hasWebSocketConnectedOnce) {
             showWarningToast();
          }
          // Implement exponential backoff or simple delay for reconnection
          if (connectAttemptTimeout) clearTimeout(connectAttemptTimeout);
          connectAttemptTimeout = setTimeout(connectWebSocket, 5000); // Reconnect after 5 seconds
        } else {
          console.log(
            `WebSocket connection closed. Warp status is ${currentWarpRef.current?.jobStatus}. No reconnect needed.`,
             currentWarpRef.current,
          );
          socketRef.current = null; // Clear the ref if connection closed intentionally
          // Ensure connecting state is false if warp stops
          setIsConnectingWebSocket(false);
          setHasWebSocketConnectedOnce(false);
          setIsWarmingUp(false); 
          setWasWarpInitiallyInProgress(false); // Reset initial state tracker on cleanup
          if (initialConnectTimeout) {
            clearTimeout(initialConnectTimeout);
          }
        }
      };

      newSocket.onerror = error => {
        // Only show warning toast if it had previously connected
        if (hasWebSocketConnectedOnce) {
           showWarningToast();
        }
        console.error('WebSocket errorrr:', error, socketRef?.current);
      };

      console.log('settingCurrentSocket1212');
    };

    // Initiate connection conditionally
    if (wasWarpInitiallyInProgress) {
       // If warp was already running, connect immediately
       console.log("Warp was initially IN_PROGRESS. Attempting immediate WebSocket connection...");
       connectWebSocket();
    } else {
      // If warp started during this session, add initial delay
      console.log('Warp started this session. Scheduling initial connection attempt with delay...');
      // Clear any existing initial timeout before setting a new one
      if (initialConnectTimeout) clearTimeout(initialConnectTimeout);
      
      initialConnectTimeout = setTimeout(() => {
          console.log('Initial delay complete. Attempting first WebSocket connection...');
          connectWebSocket();
      }, 3000); // 3-second initial delay
    }

    // Cleanup function
    return () => {
       console.log('Cleaning up WebSocket effect...');
       // Clear both potential timeouts
       if (initialConnectTimeout) {
         clearTimeout(initialConnectTimeout);
       }
       if (connectAttemptTimeout) {
         clearTimeout(connectAttemptTimeout);
       }
      if (newSocket) {
         console.log('Closing WebSocket connection during cleanup.');
         // Prevent automatic reconnection attempts during cleanup
         newSocket.onclose = null;
         newSocket.onerror = null;
         newSocket.close();
         socketRef.current = null;
      }
      // Clear connecting state on cleanup or if status changes
      setIsConnectingWebSocket(false);
      setHasWebSocketConnectedOnce(false);
      setIsWarmingUp(false); 
      setWasWarpInitiallyInProgress(false); // Reset initial state tracker on cleanup
    };
  // Depend on the job status and worker ID being present
  }, [warp?.jobStatus, warp?.workerId, showWarningToast]); // Added showWarningToast

  // New Effect to finalize connection state after first frame is processed
  useEffect(() => {
    if (isWarmingUp && frameCount > 0) {
      setIsWarmingUp(false);
      setIsConnectingWebSocket(false);
      setHasWebSocketConnectedOnce(true);
    }
    // We only want this to run when frameCount increases *during* warm-up
  }, [frameCount, isWarmingUp]); 

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);

      setVideoSrc(url);
    }
  };

  const clearVideo = () => {
    setVideoSrc(null);
    videoRef.current = null;
  };

  // Small inline spinner for the button
  const ButtonSpinner = () => (
    <svg
      className="animate-spin h-4 w-4 text-white mx-auto"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  return (
    <div className="bg-[#121212] text-[#e0e0e0] font-sans flex flex-col items-center px-5">
      {(warp?.jobStatus === 'IN_QUEUE' || isConnectingWebSocket) && warp?.jobStatus !== 'COMPLETED' && warp?.jobStatus !== 'FAILED' && warp?.jobStatus !== 'CANCELLED' && (
        <PendingModal
          isConnecting={isConnectingWebSocket && !isWarmingUp}
          isWarmingUp={isWarmingUp}
          handleClickEndWarp={handleClickEndWarp}
        />
      )}
      {showWarpEndedModal && (
         <WarpEndedModal onClose={() => setShowWarpEndedModal(false)} />
      )}
      <h2 className="w-full text-sm sm:text-lg font-bold my-2 text-blue-400 text-center">
        Time remaining:{' '}
        {calcualatedTimeRemaining
          ? formatTimeBalance(calcualatedTimeRemaining)
          : dbUser?.timeBalance
          ? formatTimeBalance(dbUser?.timeBalance)
          : 'N/A'}
      </h2>
      <div className="max-w-[800px] w-full bg-[#1e1e1e] rounded-lg shadow-lg p-8 mb-5">
        <select
          value={selectedDeviceId || ''}
          onChange={e => {
            setSelectedDeviceId(e.target.value);
            // startVideoStream(e.target.value);
          }}
          className="w-full p-1 sm:p-3 mb-2 border border-[#4a4a4a] rounded-md bg-[#1e1e1e] text-[#e0e0e0] text-sm sm:text-md"
        >
          {devices.map(device => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Camera ${devices.indexOf(device) + 1}`}
            </option>
          ))}
        </select>

        <select
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedAudioDeviceId(e.target.value)}
          className={`w-full p-3 mb-5 border border-[#4a4a4a] rounded-md text-base bg-[#1e1e1e] text-[#e0e0e0]${
            audioContextRef.current ? '' : ' hidden'
          }`}
        >
          {audioDevices.map(device => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Microphone ${audioDevices.indexOf(device) + 1}`}
            </option>
          ))}
        </select>

        <select
          value={selectedPrompt}
          onChange={e => setSelectedPrompt(e.target.value)}
          className="w-full p-1 sm:p-3 mb-2 border border-[#4a4a4a] rounded-md bg-[#1e1e1e] text-[#e0e0e0] text-sm sm:text-md"
        >
          {promptLibraryOptions.map(option => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendPrompt();
            }
          }}
          placeholder="Enter prompt..."
          className="w-full p-1 sm:p-3 mb-2 border border-[#4a4a4a] rounded-md bg-[#1e1e1e] text-[#e0e0e0] resize-y min-h-[100px] text-sm sm:text-md"
          disabled={warp?.jobStatus !== 'IN_PROGRESS'}
        />

        <input
          type="text"
          value={postText}
          onChange={e => setPostText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              sendPrompt();
            }
          }}
          placeholder="Post text, appended to all prompts. Helps to describe yourself"
          className="w-full p-1 sm:p-3 mb-2 border border-[#4a4a4a] rounded-md bg-[#1e1e1e] text-[#e0e0e0] text-sm sm:text-md"
          disabled={warp?.jobStatus !== 'IN_PROGRESS'}
        />
        <div className="flex flex-wrap justify-center gap-2 my-3">
          <button
            onClick={() => sendPrompt()}
            className={`bg-[#4a90e2] text-[#e0e0e0] border-none py-2 px-3 rounded-md cursor-pointer text-sm transition-all hover:bg-[#3a7bd5] hover:-translate-y-0.5 active:translate-y-0 ${
              warp?.jobStatus !== 'IN_PROGRESS' ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={warp?.jobStatus !== 'IN_PROGRESS'}
          >
            Send Prompt
          </button>
          <button
            onClick={() => {
              const shouldStartWarping = !isStreamingRef.current;
              if (shouldStartWarping) {
                // Start streaming immediately
                console.log("Start Warping click - setting isStreamingRef true");
                isStreamingRef.current = true;
 
                // Check if it's the first time starting AND required initialization
                if (!hasClickedStartWarping && !wasWarpInitiallyInProgress) {
                    console.log("First Start Warping click after init. Showing visual loading...");
                    setHasClickedStartWarping(true);
                    setIsInitialWarpingLoading(true);
                    // Only use timeout to turn *off* the visual loading state
                    setTimeout(() => {
                      console.log("Visual loading period complete.");
                      setIsInitialWarpingLoading(false);
                    }, 5000); // Show loading for 5 seconds 
                }
                forceUpdate({}); // Force re-render to update button text
              } else {
                 // Clicking to stop
                 console.log("Stop Warping click.");
                 isStreamingRef.current = false;
                 setIsInitialWarpingLoading(false); // Ensure loading stops if cancelled
                 forceUpdate({}); // Force re-render
              }
            }}
            className={`text-[#e0e0e0] border-none py-2 px-3 rounded-md cursor-pointer text-sm transition-all hover:-translate-y-0.5 active:translate-y-0 ${
              warp?.jobStatus !== 'IN_PROGRESS'
                ? 'bg-gray-500 opacity-50 cursor-not-allowed' // Disabled state
                : isStreamingRef.current
                ? 'bg-gray-600 hover:bg-gray-700' // Stop button state
                : 'bg-[#4a90e2] hover:bg-[#3a7bd5]' // Start button state
            }`}
            disabled={warp?.jobStatus !== 'IN_PROGRESS'}
          >
             {/* Conditional content: Spinner or Text */} 
            {isInitialWarpingLoading ? (
              <span className="flex items-center justify-center">
                 <ButtonSpinner />
                 <span className="ml-2">Initializing warp...</span>
              </span>
            ) : isStreamingRef.current ? (
              'Stop Warping'
            ) : (
              'Start Warping'
            )}
          </button>

          <button
            onClick={handleClickShowAdvanced}
            className="bg-[#2c3e50] text-[#e0e0e0] border-none py-2 px-3 rounded-md cursor-pointer text-sm transition-all hover:bg-[#34495e] hover:-translate-y-0.5 active:translate-y-0"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced
          </button>
          <button
            onClick={handleClickEndWarp}
            className="bg-[#2c3e50] text-[#e0e0e0] border-none py-2 px-3 rounded-md cursor-pointer text-sm transition-all hover:bg-[#34495e] hover:-translate-y-0.5 active:translate-y-0"
          >
            End Warp
          </button>
          <button
            onClick={handleClickShowDJMode}
            className="bg-[#2c3e50] text-[#e0e0e0] border-none py-2 px-3 rounded-md cursor-pointer text-sm transition-all hover:bg-[#34495e] hover:-translate-y-0.5 active:translate-y-0"
          >
            DJ Mode
          </button>

          <button
            onClick={toggleFullBrowser}
            className="bg-[#2c3e50] text-[#e0e0e0] border-none py-2 px-3 rounded-md cursor-pointer text-sm transition-all hover:bg-[#34495e] hover:-translate-y-0.5 active:translate-y-0"
          >
            Fullscreen
          </button>
        </div>
        {showAdvanced && (
          <div>
            <div className="my-2">
              <button
                onClick={toggleAudioLoopback}
                className={`${
                  isAudioLoopbackActive ? 'bg-[#e74c3c]' : 'bg-[#4a90e2]'
                } text-[#e0e0e0] border-none py-2 px-3 rounded-md cursor-pointer text-sm transition-all hover:bg-[${
                  isAudioLoopbackActive ? '#c0392b' : '#3a7bd5'
                }] hover:-translate-y-0.5 active:translate-y-0 ${
                  isAudioLoopbackSupported ? '' : 'hidden'
                }`}
              >
                {isAudioLoopbackActive ? 'Stop' : 'Start'} Mic Loopback for
                screen recording
              </button>
            </div>
            <div className="my-2">
              <button
                onClick={toggleFullscreen}
                className="bg-[#2c3e50] text-[#e0e0e0] border-none py-2 px-3 rounded-md cursor-pointer text-sm transition-all hover:bg-[#34495e] hover:-translate-y-0.5 active:translate-y-0"
              >
                Complete Fullscreen
              </button>
            </div>
            <p>FPS: {calculatedFps}</p>
            <p>
              Frames in frontend render queue: {frameQueueRef?.current?.length}
            </p>
            <p>
              Drop every nth frame (useful if the warped video lags too far
              behind)
            </p>
            <select
              id="frameDrop"
              className="w-full p-3 mb-5 border border-[#4a4a4a] rounded-md text-base bg-[#1e1e1e] text-[#e0e0e0]"
              value={dropEvery}
              onChange={e => {
                console.log('Selected frame drop:', e.target.value);
                setDropEvery(e.target.value);
              }}
            >
              <option value="none">None</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>
            <div className="mb-4">
              <label
                htmlFor="videoUpload"
                className="bg-[#4a90e2] text-[#e0e0e0] border-none py-2 px-3 rounded-md cursor-pointer text-sm transition-all hover:bg-[#3a7bd5] hover:-translate-y-0.5 active:translate-y-0 inline-block"
              >
                Use Video File Source Instead of Webcam
              </label>
              <input
                id="videoUpload"
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>{' '}
            {videoSrc && (
              <div className="mb-4">
                <video
                  ref={videoRef}
                  src={videoSrc}
                  controls
                  autoPlay
                  loop
                  muted={isVideoFileMuted}
                  className="mb-4"
                  style={{
                    maxWidth: '512px',
                    maxHeight: '512px',
                    display: 'none',
                  }}
                />
                <button
                  onClick={clearVideo}
                  className="bg-[#4a90e2] text-[#e0e0e0] border-none py-2 px-3 rounded-md cursor-pointer text-sm transition-all hover:bg-[#3a7bd5] hover:-translate-y-0.5 active:translate-y-0 mr-2"
                >
                  Clear Video
                </button>
                <button
                  onClick={() => {
                    const video = videoRef.current;
                    if (video) {
                      if (video.paused) {
                        video.play();
                      } else {
                        video.pause();
                      }
                    }
                  }}
                  className="bg-[#4a90e2] text-[#e0e0e0] border-none py-2 px-3 rounded-md cursor-pointer text-sm transition-all hover:bg-[#3a7bd5] hover:-translate-y-0.5 active:translate-y-0 mr-2"
                >
                  Play/Pause
                </button>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={isVideoFileMuted}
                    onChange={() => setIsVideoFileMuted(prev => !prev)}
                    className="mr-2"
                  />
                  Mute Video
                </label>
              </div>
            )}
          </div>
        )}
        {showDJMode && (
          // @ts-ignore
          <MidiStuffPage
            sendPrompt={sendPrompt}
            prompt={prompt}
            setPrompt={setPrompt}
            secondPrompt={secondPrompt}
            setSecondPrompt={setSecondPrompt}
            blendValue={blendValue}
            setBlendValue={setBlendValue}
            warp={warp}
            switchToNextDevice={switchToNextDevice}
            switchToPreviousDevice={switchToPreviousDevice}
            selectedDeviceId={selectedDeviceId}
          />
        )}

        <div className="w-full flex flex-col-reverse sm:flex-row">
          <canvas
            ref={croppedCanvasRef}
            width={FRAME_WIDTH}
            height={FRAME_HEIGHT}
            className="w-full sm:w-1/2 max-w-[512px] rounded-md shadow-md mb-5 sm:mb-0 sm:mr-2 cropped"
          />
          <canvas
            ref={processedCanvasRef}
            width={FRAME_WIDTH}
            height={FRAME_HEIGHT}
            className={`${
              isFullBrowser
                ? 'fixed top-0 left-0 w-screen h-screen z-50'
                : 'w-full sm:w-1/2 max-w-[512px] rounded-md shadow-md mb-5 sm:mb-0 sm:ml-2 cropped'
            }${isStreamingRef?.current ? '' : ' hidden'}`}
            style={{
              objectFit: isFullBrowser ? 'contain' : 'cover',
              backgroundColor: isFullBrowser ? 'black' : 'transparent',
            }}
          />
        </div>
      </div>
      <ToastContainer
        position="bottom-right"
        autoClose={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        theme="dark"
        transition={Bounce}
      />
      {isFullBrowser && (
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={() => setIsFullBrowser(false)}
            className="bg-[#4a4a4a] text-white p-2 rounded-full"
          >
            X
          </button>
        </div>
      )}
    </div>
  );
};

export default GenDJ;
