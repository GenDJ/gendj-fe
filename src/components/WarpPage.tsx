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

const FRAME_WIDTH = 512;
const FRAME_HEIGHT = 512;
const FRAME_RATE = 30;
const FRAME_DURATION = 1000 / FRAME_RATE;

interface Option {
  value: string;
  label: string;
}

const buildWebsocketUrlFromPodId = (podId: string) => {
  if (IS_WARP_LOCAL) {
    return `ws://localhost:8765`;
  } else {
    return `wss://${podId}-8766.proxy.runpod.net`;
  }
};

const buildPromptEndpointUrlFromPodId = (
  podId: string,
  promptIndex: number = 1,
) => {
  if (IS_WARP_LOCAL) {
    if (promptIndex === 1) {
      return `http://localhost:5556/prompt/`;
    } else {
      return `http://localhost:5556/secondprompt/`;
    }
  } else {
    if (promptIndex === 1) {
      return `https://${podId}-5556.proxy.runpod.net/prompt/`;
    } else {
      return `https://${podId}-5556.proxy.runpod.net/secondprompt/`;
    }
  }
};

const buildBlendEndpointUrlFromPodId = (podId: string) => {
  if (IS_WARP_LOCAL) {
    return `http://localhost:5556/blend/`;
  } else {
    return `https://${podId}-5556.proxy.runpod.net/blend/`;
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

const GenDJ = ({ dbUser }: { dbUser: any }) => {
  const { getToken, isLoaded } = useConditionalAuth();

  const videoRef = useRef(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [devices, setDevices] = useState([]);
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
  const [dropEvery, setDropEvery] = useState();

  const [calculatedFps, setcalculatedFps] = useState(0);
  const [warp, setWarp] = useState<any>(null);
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);
  const [podSetupProgress, setPodSetupProgress] = useState(1);

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
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState(null);
  const audioContextRef = useRef(null);
  const audioStreamRef = useRef(null);

  const lastBlendSendTimeRef = useRef(0);
  const blendTimeoutIdRef = useRef(null);

  const [isAudioLoopbackSupported, setIsAudioLoopbackSupported] =
    useState(true);

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
      const AudioContext = window.AudioContext || window.webkitAudioContext;
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

        const AudioContext = window.AudioContext || window.webkitAudioContext;
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
        alert(`Unable to start audio loopback: ${error.message}`);
      }
    } else {
      // If active, stop the loopback
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }
      setIsAudioLoopbackActive(false);
    }
  };

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
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

  const handleClickShowAdvanced = prev => {
    setShowAdvanced(prev => !prev);
  };
  const handleClickShowDJMode = prev => {
    setShowDJMode(prev => !prev);
  };

  useEffect(() => {
    if (warp?.podStatus === 'PENDING') {
      const interval = setInterval(() => {
        setPodSetupProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 1;
        });
      }, 1400);

      return () => clearInterval(interval);
    }
  }, [warp?.podStatus]);

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

  useEffect(() => {
    if (warp?.podStatus !== 'RUNNING') return;

    const sendHeartbeat = async () => {
      if (IS_WARP_LOCAL) {
        return;
      }
      try {
        const token = await getToken();
        const response = await fetch(
          createFullEndpoint(`warps/${warp.id}/heartbeat`),
          {
            method: 'POST',
            body: '{}',
            headers: {
              Authorization: `Bearer ${token}`,
              credentials: 'include',
            },
          },
        );

        if (response.ok) {
          const { estimatedUserTimeBalance } = await response.json();

          if (estimatedUserTimeBalance) {
            setCalcualatedTimeRemaining(estimatedUserTimeBalance);
          }
        } else {
          console.error('Failed to send heartbeat');
        }
      } catch (error) {
        console.error('Error sending heartbeat:', error);
      }
    };

    const heartbeatInterval = setInterval(sendHeartbeat, 10000); // 10 seconds

    // Cleanup function
    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [warp?.podStatus]);

  useEffect(() => {
    const initializeWarp = async () => {
      const token = await getToken();

      const response = await fetch(createFullEndpoint(`warps`), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      let shouldHandleError = false;
      let responseJson;
      if (response.ok) {
        responseJson = await response.json();
        const { entities, estimatedUserTimeBalance } = responseJson;
        console.log('Response entities:', entities);
        const warp = entities?.warps?.[0];
        console.log('warptoset1212', warp);
        if (warp?.podId) {
          setWarp(warp);
          if (estimatedUserTimeBalance) {
            setCalcualatedTimeRemaining(estimatedUserTimeBalance);
          }
        } else {
          console.log('response no podd id1212');
          shouldHandleError = true;
        }
      } else {
        console.log('response not ok1212');
        shouldHandleError = true;
      }

      if (shouldHandleError) {
        if (!responseJson) {
          responseJson = await response.json(); // Assuming the error details are in JSON format
        }
        const errorMessage = responseJson.message;
        setUiError(
          `Request failed with status: ${errorMessage} \ncontact@gendj.com if the problem continues`,
        );
      }
    };

    const initializeLocal = () => {
      const warp = {
        id: 'local',
        podId: 'local',
        podStatus: 'RUNNING',
      };
      setWarp(warp);
    };

    if (IS_WARP_LOCAL) {
      initializeLocal();
    } else {
      initializeWarp();
    }

    checkWebcamPermissions();
  }, []);

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
    const handleEscKey = event => {
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
      if (!warp?.podId) {
        console.error('Prompt endpoint URL not available');
        return;
      }

      const promptEndpointUrl = buildPromptEndpointUrlFromPodId(
        warp.podId,
        promptIndex,
      );
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

  const sendBlendRequest = value => {
    if (!warp?.podId) {
      return;
    }
    const promptEndpointUrl = buildBlendEndpointUrlFromPodId(warp.podId);
    const endpoint = `${promptEndpointUrl}${value}`;

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

  const handleSliderChange = value => {
    console.log('hsc1212', value);
    const now = Date.now();
    if (now - lastBlendSendTimeRef.current >= 24) {
      sendBlendRequest(value);
      lastBlendSendTimeRef.current = now;
    } else {
      clearTimeout(blendTimeoutIdRef.current);
      blendTimeoutIdRef.current = setTimeout(() => {
        sendBlendRequest(value);
        lastBlendSendTimeRef.current = Date.now();
      }, 60);
    }
  };

  useEffect(() => {
    handleSliderChange(blendValue);

    return () => {
      clearTimeout(blendTimeoutIdRef.current);
    };
  }, [blendValue]);

  const handleClickEndWarp = useCallback(() => {
    if (!warp?.id) {
      console.error('Warp id not currently set');
      return;
    }

    const endWarp = async () => {
      const token = await getToken();
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

      const { entities } = await response.json();

      const updatedWarp = entities?.warps?.[0];
      console.log('settingendedwarp1212', updatedWarp);
      setWarp(updatedWarp);
    };

    if (confirm('Are you sure you want to end the warp?')) {
      endWarp();
    }
  }, [warp?.id]);

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

        if (video) {
          frame = video;
          croppedCanvas.width = FRAME_WIDTH;
          croppedCanvas.height = FRAME_HEIGHT;

          scaleWidth = FRAME_WIDTH / video.videoWidth;
          scaleHeight = FRAME_HEIGHT / video.videoHeight;
          scale = Math.min(scaleWidth, scaleHeight);

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
      } else if (canvas.mozRequestFullScreen) {
        // Firefox
        canvas.mozRequestFullScreen();
      } else if (canvas.webkitRequestFullscreen) {
        // Chrome, Safari and Opera
        canvas.webkitRequestFullscreen();
      } else if (canvas.msRequestFullscreen) {
        // IE/Edge
        canvas.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.mozCancelFullScreen) {
        // Firefox
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) {
        // Chrome, Safari and Opera
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        // IE/Edge
        document.msExitFullscreen();
      }
    }
  };

  useEffect(() => {
    console.log('connectWebSocket1212', socketRef.current, warp);
    if (!warp?.podId) {
      console.log('WebSocket URL not available');
      return;
    }

    let newSocket: WebSocket | null = null;
    const connectWebSocket = () => {
      const websocketUrl = buildWebsocketUrlFromPodId(warp.podId);

      newSocket = new WebSocket(websocketUrl);

      newSocket.binaryType = 'arraybuffer';

      newSocket.onopen = () => {
        console.log('WebSocket connection openeddd');
        if (currentToastRef.current) {
          toast.dismiss(currentToastRef.current);
        }
      };

      newSocket.onmessage = event => {
        // console.log('gotframe1212');
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
        };
        img.src = url;
      };

      newSocket.onclose = () => {
        if (currentWarpRef.current?.podStatus === 'RUNNING') {
          console.log(
            'WebSocket connection closed. Attempting to reconnectt...',
            currentWarpRef.current,
          );
          showWarningToast();
          setTimeout(connectWebSocket, 1);
        } else {
          console.log(
            `WebSocket connection closed for warp: `,
            currentWarpRef.current,
          );
        }
      };

      newSocket.onerror = error => {
        showWarningToast();

        console.error('WebSocket errorrr:', error, socketRef?.current);
      };

      console.log('settingCurrentSocket1212');
      socketRef.current = newSocket;
    };

    const getPodStatus = async (warpId: string) => {
      try {
        const token = await getToken();
        const response = await fetch(createFullEndpoint(`warps/${warpId}`), {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            credentials: 'include',
          },
        });

        const { entities } = await response.json();
        const newWarp = entities?.warps?.[0];
        console.log(
          'got pod status on interval1212',
          newWarp,
          newWarp?.podStatus,
        );
        if (newWarp?.podStatus !== 'PENDING') {
          setWarp(newWarp);
        }
      } catch (error) {
        console.error('Error getting pod status:', error);
      }
    };

    let podStatusInterval: NodeJS.Timeout | null = null;
    if (warp?.podStatus === 'RUNNING') {
      connectWebSocket();
    } else if (warp?.podStatus === 'DEAD' || warp?.podStatus === 'ENDED') {
      if (currentToastRef.current) {
        toast.dismiss(currentToastRef.current);
      }
      toast.error('The warp has ended. Please refresh page', {
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
    } else if (warp.podId) {
      podStatusInterval = setInterval(() => {
        if (warp?.podStatus === 'PENDING') {
          getPodStatus(warp.id);
        }
      }, 3000);
    }

    // Cleanup function
    return () => {
      if (newSocket) {
        newSocket.close();
      }

      if (podStatusInterval) {
        clearInterval(podStatusInterval);
      }
    };
  }, [warp?.id, warp?.podStatus]);

  const handleFileSelect = event => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);

      setVideoSrc(url);
    }
  };

  const clearVideo = () => {
    setVideoSrc(null);
    videoRef.current = null;
  };

  return (
    <div className="bg-[#121212] text-[#e0e0e0] font-sans flex flex-col items-center px-5">
      {warp?.podStatus === 'PENDING' && (
        <PendingModal
          progress={podSetupProgress}
          handleClickEndWarp={handleClickEndWarp}
        />
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
          onChange={e => setSelectedAudioDeviceId(e.target.value)}
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
        />
        <div className="flex flex-wrap justify-center gap-2 my-3">
          <button
            onClick={() => sendPrompt()}
            className="bg-[#4a90e2] text-[#e0e0e0] border-none py-2 px-3 rounded-md cursor-pointer text-sm transition-all hover:bg-[#3a7bd5] hover:-translate-y-0.5 active:translate-y-0"
          >
            Send Prompt
          </button>
          <button
            onClick={() => {
              isStreamingRef.current = !isStreamingRef.current;
            }}
            className="bg-[#4a90e2] text-[#e0e0e0] border-none py-2 px-3 rounded-md cursor-pointer text-sm transition-all hover:bg-[#3a7bd5] hover:-translate-y-0.5 active:translate-y-0"
          >
            {isStreamingRef.current ? 'Stop' : 'Start'} Warping
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
                    if (video.paused) {
                      video.play();
                    } else {
                      video.pause();
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
            {/* <textarea
              value={secondPrompt}
              onChange={e => setSecondPrompt(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendPrompt(2);
                }
              }}
              placeholder="Enter second prompt..."
              className="w-full p-1 sm:p-3 mb-2 border border-[#4a4a4a] rounded-md bg-[#1e1e1e] text-[#e0e0e0] resize-y min-h-[100px] text-sm sm:text-md"
            />
            <button
              onClick={() => sendPrompt(2)}
              className="bg-[#4a90e2] text-[#e0e0e0] border-none py-2 px-3 rounded-md cursor-pointer text-sm transition-all hover:bg-[#3a7bd5] hover:-translate-y-0.5 active:translate-y-0"
            >
              Send Second Prompt
            </button> */}
            {/* <div className="w-full mb-4">
              <label
                htmlFor="blendSlider"
                className="block text-sm font-medium text-[#e0e0e0] mb-2"
              >
                Blend: <span>{blendValue.toFixed(2)}</span>
              </label>
              <input
                type="range"
                id="blendSlider"
                min={0}
                max={1}
                step={0.01}
                value={blendValue}
                onChange={e => setBlendValue(parseFloat(e.target.value))}
                className="w-full h-2 bg-[#4a4a4a] rounded-lg appearance-none cursor-pointer"
              />
            </div> */}
          </div>
        )}
        {showDJMode && (
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
