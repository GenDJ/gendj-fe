import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { gaInit, gaSendPageview } from '#root/utils/ga4.ts';
import { useDetectAdBlock } from 'adblock-detect-react';

export default function useAnalytics() {
  const location = useLocation();
  const adBlockDetected = useDetectAdBlock();

  useEffect(() => {
    if (!adBlockDetected) {
      gaInit();
      console.log("ab not detected1212");
    } else {
      console.log("ab yes detected1212");
    }
  }, []);

  useEffect(() => {
    const path = location.pathname + location.search;
    if (!adBlockDetected) {
      gaSendPageview(path);
    }
  }, [adBlockDetected, location]);
}
