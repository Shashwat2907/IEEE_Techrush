import { useState, useEffect, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppProvider, useApp, VIEW_STATES } from './context/AppContext';
import { FilterProvider } from './context/FilterContext';
import { ItineraryProvider } from './context/ItineraryContext';
import { CompareProvider } from './context/CompareContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { GlobeLoadingSkeleton, LoadingSkeleton } from './components/ui/LoadingSkeleton';
import { isFeatureEnabled } from './config/features';
import GlobeSearch from './features/globe-home/GlobeSearch';
import GlobeFilters from './features/globe-home/GlobeFilters';

// Lazy load heavy components for code splitting
const GlobeScene = lazy(() => import('./features/globe-home/GlobeScene'));
const DiscoveryQuiz = lazy(() => import('./features/discovery-quiz/DiscoveryQuiz'));
const DestinationMap = lazy(() => import('./features/destination-map/DestinationMap'));
const ItineraryBuilder = lazy(() => import('./features/itinerary/ItineraryBuilder'));

function AppContent() {
  const { viewState, showQuiz, isTransitioning, isReversingTransition } = useApp();
  const [itineraryOpen, setItineraryOpen] = useState(false);

  const isGlobeView = viewState === VIEW_STATES.GLOBE_HOME ||
    viewState === VIEW_STATES.DISCOVERY_QUIZ ||
    viewState === VIEW_STATES.FLIGHT_TRANSITION;

  const quizActive = viewState === VIEW_STATES.DISCOVERY_QUIZ;
  
  // When transitioning, we fade out the header and search
  const isSearchSubmitted = isTransitioning || isReversingTransition;

  return (
    <div className="w-full h-full bg-bg-base relative overflow-hidden flex flex-col">
      {/* ─── Globe View (Zones A, B, C) ─── */}
      {isGlobeView && (
        <div className="w-full h-full flex flex-col absolute inset-0 z-0">
          
          {/* ZONE A: Header */}
          <div className={`transition-all duration-700 ease-in-out ${isSearchSubmitted ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
            <div className="pt-8 pb-4 text-center">
              <h1 className="font-display text-4xl font-bold text-text-primary">
                Trip<span className="text-accent-ochre">Nest</span>
              </h1>
              <p className="font-mono text-xs text-text-secondary tracking-widest mt-2 uppercase">
                Your world, explored
              </p>
            </div>
          </div>

          {/* ZONE B: Search Bar */}
          <div className={`transition-all duration-700 ease-in-out ${isSearchSubmitted ? 'opacity-0 scale-95 h-0 overflow-hidden' : 'opacity-100 scale-100 h-auto'}`}>
            {!quizActive && (
              <div className="w-full z-10 px-4">
                <GlobeSearch />
                <GlobeFilters />
              </div>
            )}
          </div>

          {/* ZONE C: Globe */}
          <div className="flex-1 relative w-full overflow-hidden mt-4">
            {/* We translate the globe downwards to crop it at the bottom */}
            <div className="absolute inset-x-0 w-full" style={{ top: '10%', height: '140%' }}>
              {isFeatureEnabled('globe-home') ? (
                <Suspense fallback={<GlobeLoadingSkeleton />}>
                  <GlobeScene />
                </Suspense>
              ) : (
                <div className="flex items-center justify-center h-full text-text-secondary font-mono text-sm">
                  Globe module disabled
                </div>
              )}
            </div>
          </div>

          {/* "Not sure yet?" button */}
          {!quizActive && viewState === VIEW_STATES.GLOBE_HOME && !isSearchSubmitted && (
            <button
              onClick={showQuiz}
              style={{ zIndex: 10 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2
                px-6 py-3 bg-surface/80 backdrop-blur-sm border border-surface-raised
                rounded-full text-text-secondary text-sm font-body
                hover:border-accent-trail hover:text-accent-trail
                transition-all duration-300 ease-field-atlas
                hover:shadow-lg hover:shadow-accent-trail/20"
            >
              <span className="mr-2">🧭</span>
              Not sure where to go?
            </button>
          )}
        </div>
      )}

      {/* ─── Discovery Quiz overlay ─── */}
      <AnimatePresence>
        {viewState === VIEW_STATES.DISCOVERY_QUIZ && isFeatureEnabled('discovery-quiz') && (
          <Suspense fallback={null}>
            <DiscoveryQuiz />
          </Suspense>
        )}
      </AnimatePresence>

      {/* ─── Destination Map ─── */}
      <AnimatePresence>
        {viewState === VIEW_STATES.DESTINATION_MAP && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.0 }}
            className="absolute inset-0 z-10"
          >
            {isFeatureEnabled('destination-map') ? (
              <Suspense fallback={
                <div className="flex items-center justify-center h-full bg-bg-base">
                  <LoadingSkeleton type="panel" />
                </div>
              }>
                <DestinationMapWithItinerary
                  itineraryOpen={itineraryOpen}
                  setItineraryOpen={setItineraryOpen}
                />
              </Suspense>
            ) : (
              <div className="flex items-center justify-center h-full text-text-secondary font-mono text-sm">
                Map module disabled
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Wrapper that combines DestinationMap with ItineraryBuilder
 */
function DestinationMapWithItinerary({ itineraryOpen, setItineraryOpen }) {
  return (
    <>
      <DestinationMap />

      {/* Itinerary toggle button (always visible on map) */}
      {isFeatureEnabled('itinerary') && !itineraryOpen && (
        <button
          onClick={() => setItineraryOpen(true)}
          className="fixed bottom-6 right-6 z-[1000] px-5 py-3 bg-accent-ochre text-bg-base
            rounded-full font-body font-semibold text-sm shadow-lg shadow-accent-ochre/30
            hover:shadow-xl hover:shadow-accent-ochre/40 hover:scale-105
            transition-all duration-200 flex items-center gap-2"
        >
          <span>📅</span>
          Plan Trip
        </button>
      )}

      {/* Itinerary drawer */}
      <AnimatePresence>
        {itineraryOpen && isFeatureEnabled('itinerary') && (
          <Suspense fallback={null}>
            <ItineraryBuilder
              isOpen={itineraryOpen}
              onClose={() => setItineraryOpen(false)}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </>
  );
}

export default function App() {
  useEffect(() => {
    setTimeout(() => {
      console.log("=== DOM DUMP START ===");
      console.log(document.getElementById('root').outerHTML);
      console.log("=== DOM DUMP END ===");
    }, 3000);
  }, []);

  return (
    <ErrorBoundary name="TripNest">
      <ThemeProvider>
        <AppProvider>
          <FilterProvider>
            <ItineraryProvider>
              <CompareProvider>
                <AppContent />
              </CompareProvider>
            </ItineraryProvider>
          </FilterProvider>
        </AppProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
