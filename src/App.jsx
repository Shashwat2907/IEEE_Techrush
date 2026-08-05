import { useState, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppProvider, useApp, VIEW_STATES } from './context/AppContext';
import { FilterProvider } from './context/FilterContext';
import { ItineraryProvider, useItinerary } from './context/ItineraryContext';
import { CompareProvider } from './context/CompareContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { GlobeLoadingSkeleton, LoadingSkeleton } from './components/ui/LoadingSkeleton';
import { isFeatureEnabled } from './config/features';
import GlobeSearch from './features/globe-home/GlobeSearch';

const GlobeScene = lazy(() => import('./features/globe-home/GlobeScene'));
const DiscoveryQuiz = lazy(() => import('./features/discovery-quiz/DiscoveryQuiz'));
const DestinationMap = lazy(() => import('./features/destination-map/DestinationMap'));
const ItineraryBuilder = lazy(() => import('./features/itinerary/ItineraryBuilder'));
const PackingList = lazy(() => import('./features/itinerary/PackingList'));
const CompareDrawer = lazy(() => import('./features/destination-map/CompareDrawer'));

function AppContent() {
  const { viewState, isTransitioning, isReversingTransition } = useApp();
  const [itineraryOpen, setItineraryOpen] = useState(false);
  const [packingOpen, setPackingOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  const isGlobeView = viewState === VIEW_STATES.GLOBE_HOME ||
    viewState === VIEW_STATES.DISCOVERY_QUIZ ||
    viewState === VIEW_STATES.FLIGHT_TRANSITION;

  const quizActive = viewState === VIEW_STATES.DISCOVERY_QUIZ;
  const isSearchSubmitted = isTransitioning || isReversingTransition;

  return (
    <div className="w-full h-full bg-bg-base relative overflow-hidden flex flex-col">
      {/* ─── Globe View ─── */}
      {isGlobeView && (
        <div className="w-full h-full flex flex-col absolute inset-0 z-0">
          <div className={`transition-all duration-700 ease-smooth z-20 ${isSearchSubmitted ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
            <div className="pt-8 sm:pt-12 pb-2 text-center select-none">
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-[0.14em] text-white/95 uppercase">
                TRIPNEST
              </h1>
              <p className="text-text-secondary text-sm sm:text-base mt-2 font-body font-light tracking-wide">
                Explore. Plan. Fly.
              </p>
            </div>
          </div>

          <div className={`transition-all duration-700 ease-smooth z-20 ${isSearchSubmitted ? 'opacity-0 scale-95 h-0 overflow-hidden' : 'opacity-100 scale-100 h-auto'}`}>
            {!quizActive && (
              <div className="w-full px-4">
                <GlobeSearch />
              </div>
            )}
          </div>

          <div className="flex-1 relative w-full overflow-hidden mt-1">
            <div className="absolute inset-x-0 w-full" style={{ top: '6%', height: '145%' }}>
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
        </div>
      )}

      {/* Quiz overlay */}
      <AnimatePresence>
        {viewState === VIEW_STATES.DISCOVERY_QUIZ && isFeatureEnabled('discovery-quiz') && (
          <Suspense fallback={null}><DiscoveryQuiz /></Suspense>
        )}
      </AnimatePresence>

      {/* Destination Map */}
      <AnimatePresence>
        {viewState === VIEW_STATES.DESTINATION_MAP && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 1.0 }} className="absolute inset-0 z-10">
            {isFeatureEnabled('destination-map') ? (
              <Suspense fallback={
                <div className="flex items-center justify-center h-full bg-bg-base">
                  <LoadingSkeleton type="panel" />
                </div>
              }>
                <DestinationMapWithItinerary
                  itineraryOpen={itineraryOpen} setItineraryOpen={setItineraryOpen}
                  packingOpen={packingOpen} setPackingOpen={setPackingOpen}
                  compareOpen={compareOpen} setCompareOpen={setCompareOpen}
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

function DestinationMapWithItinerary({ itineraryOpen, setItineraryOpen, packingOpen, setPackingOpen, compareOpen, setCompareOpen }) {
  const { selectedDestination } = useApp();
  const { tripDays } = useItinerary();

  return (
    <>
      <DestinationMap />

      {/* Bottom action bar */}
      {!itineraryOpen && !packingOpen && (
        <div className="fixed bottom-6 right-6 z-[1000] flex gap-2">
          {isFeatureEnabled('packing') && (
            <button onClick={() => setPackingOpen(true)}
              className="px-4 py-3 glass rounded-full font-body font-medium text-sm
                text-white hover:border-accent-sky/30 hover:scale-105
                transition-all duration-200 flex items-center gap-2">
              <span>🎒</span> Pack
            </button>
          )}
          {isFeatureEnabled('itinerary') && (
            <button onClick={() => setItineraryOpen(true)}
              className="px-5 py-3 bg-accent-amber text-bg-base
                rounded-full font-body font-semibold text-sm shadow-lg shadow-accent-amber/20
                hover:shadow-xl hover:shadow-accent-amber/30 hover:scale-105
                transition-all duration-200 flex items-center gap-2">
              <span>📅</span> Plan Trip
            </button>
          )}
        </div>
      )}

      <AnimatePresence>
        {itineraryOpen && isFeatureEnabled('itinerary') && (
          <Suspense fallback={null}>
            <ItineraryBuilder isOpen={itineraryOpen} onClose={() => setItineraryOpen(false)} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {packingOpen && isFeatureEnabled('packing') && (
          <Suspense fallback={null}>
            <PackingList
              destination={selectedDestination} weatherData={null}
              tripDays={tripDays} isOpen={packingOpen} onClose={() => setPackingOpen(false)}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {compareOpen && isFeatureEnabled('compare') && (
          <Suspense fallback={null}>
            <CompareDrawer isOpen={compareOpen} onClose={() => setCompareOpen(false)} />
          </Suspense>
        )}
      </AnimatePresence>
    </>
  );
}

function useApp_() { return useApp(); }

export default function App() {
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
