import { Mixpanel } from 'mixpanel-react-native';

const trackAutomaticEvents = true; // disable legacy autotrack mobile events

const mixpanel = new Mixpanel(
    'bd1915e9683b5b28633f8ba7e6add4ea',
    trackAutomaticEvents,
);

const initMixpanel = () => {
    mixpanel.init();
}

const trackEvent = (eventName: string) => {
    mixpanel.track(eventName);
}

const identifyUser = (userId: string) => {
    mixpanel.identify(userId);
}

const timingEvent = (eventName: string, time: number) => {
    mixpanel.timeEvent(eventName);
}

const stopTimingEvent = (eventName: string) => {
    mixpanel.track(eventName);
}

export {
    mixpanel,
    initMixpanel,
    trackEvent,
    identifyUser,
    timingEvent,
    stopTimingEvent,
}