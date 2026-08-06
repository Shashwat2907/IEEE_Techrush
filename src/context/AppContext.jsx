import { createContext, useContext, useState, useCallback } from 'react';

const AppContext = createContext(null);

/**
 * App-level state machine for the main view transitions:
 * GLOBE_HOME → DISCOVERY_QUIZ (overlay on globe) | FLIGHT_TRANSITION → DESTINATION_MAP
 */
export const VIEW_STATES = {
  GLOBE_HOME: 'GLOBE_HOME',
  DISCOVERY_QUIZ: 'DISCOVERY_QUIZ',
  FLIGHT_TRANSITION: 'FLIGHT_TRANSITION',
  DESTINATION_MAP: 'DESTINATION_MAP',
};

export function AppProvider({ children }) {
  const [viewState, setViewState] = useState(VIEW_STATES.GLOBE_HOME);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [flightTarget, setFlightTarget] = useState(null); // { lat, lng, name, id }
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isReversingTransition, setIsReversingTransition] = useState(false);
  const [customMarker, setCustomMarker] = useState(null); // { lat, lng, name }
  const [isPremadeOpen, setIsPremadeOpen] = useState(false);

  const navigateToGlobe = useCallback((withReverseAnim = false) => {
    setIsPremadeOpen(false);
    if (withReverseAnim) {
      setIsReversingTransition(true);
      setTimeout(() => {
        setViewState(VIEW_STATES.GLOBE_HOME);
        setSelectedDestination(null);
        setFlightTarget(null);
        setIsTransitioning(false);
        setIsReversingTransition(false);
        setCustomMarker(null);
      }, 1000);
    } else {
      setViewState(VIEW_STATES.GLOBE_HOME);
      setSelectedDestination(null);
      setFlightTarget(null);
      setIsTransitioning(false);
      setIsReversingTransition(false);
      setCustomMarker(null);
    }
  }, []);

  const showQuiz = useCallback(() => {
    setIsPremadeOpen(false);
    setViewState(VIEW_STATES.DISCOVERY_QUIZ);
  }, []);

  const hideQuiz = useCallback(() => {
    setViewState(VIEW_STATES.GLOBE_HOME);
  }, []);

  const openPremade = useCallback(() => {
    setIsPremadeOpen(true);
  }, []);

  const closePremade = useCallback(() => {
    setIsPremadeOpen(false);
  }, []);

  const flyToDestination = useCallback((destination) => {
    setIsPremadeOpen(false);
    setFlightTarget(destination);
    setIsTransitioning(true);
    setViewState(VIEW_STATES.FLIGHT_TRANSITION);
  }, []);

  const arriveAtDestination = useCallback((destination) => {
    setSelectedDestination(destination);
    setIsTransitioning(false);
    setViewState(VIEW_STATES.DESTINATION_MAP);
  }, []);

  const placeMarker = useCallback((marker) => {
    setCustomMarker(marker); // { lat, lng, name }
  }, []);

  const clearMarker = useCallback(() => {
    setCustomMarker(null);
  }, []);

  return (
    <AppContext.Provider
      value={{
        viewState,
        selectedDestination,
        flightTarget,
        isTransitioning,
        isReversingTransition,
        customMarker,
        isPremadeOpen,
        openPremade,
        closePremade,
        navigateToGlobe,
        showQuiz,
        hideQuiz,
        flyToDestination,
        arriveAtDestination,
        placeMarker,
        clearMarker,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export default AppContext;

