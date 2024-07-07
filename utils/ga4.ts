import ga4 from 'react-ga4';

const TRACKING_ID = import.meta.env.VITE_GA_TRACKING_ID as string;

const isProduction = import.meta.env.PROD;
console.log('isprod1212', isProduction);

function gaInit(userId: string | undefined = undefined) {
  if (userId && TRACKING_ID) {
    ga4.initialize(TRACKING_ID, {
      testMode: !isProduction,
      gaOptions: { userId },
    });
  } else if (TRACKING_ID) {
    ga4.initialize(TRACKING_ID, {
      testMode: !isProduction,
    });
  }
}

function gaSendEvent(name: string) {
  ga4.event('screen_view', {
    app_name: 'myApp',
    screen_name: name,
  });
}

function gaSendPageview(path: string) {
  ga4.send({
    hitType: 'pageview',
    page: path,
  });
}

export { gaInit, gaSendEvent, gaSendPageview };
