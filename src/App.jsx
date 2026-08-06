import { useState, lazy, Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AppProvider, useApp, VIEW_STATES } from './context/AppContext';
import { FilterProvider } from './context/FilterContext';
import { ItineraryProvider, useItinerary } from './context/ItineraryContext';
import { CompareProvider } from './context/CompareContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { GlobeLoadingSkeleton } from './components/ui/LoadingSkeleton';
import { isFeatureEnabled } from './config/features';
import GlobeSearch from './features/globe-home/GlobeSearch';
import MapLibreGlobe from './features/globe-home/MapLibreGlobe';

const DiscoveryQuiz = lazy(() => import('./features/discovery-quiz/DiscoveryQuiz'));
const ItineraryBuilder = lazy(() => import('./features/itinerary/ItineraryBuilder'));
const PackingList = lazy(() => import('./features/itinerary/PackingList'));
const CompareDrawer = lazy(() => import('./features/destination-map/CompareDrawer'));

function AppContent() {
  const { viewState, isTransitioning, selectedDestination } = useApp();
  const [itineraryOpen, setItineraryOpen] = useState(false);
  const [packingOpen, setPackingOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  const { tripDays } = useItinerary();

  const isOverlayHidden =
    viewState === VIEW_STATES.DESTINATION_MAP ||
    selectedDestination !== null ||
    isTransitioning;

  const quizActive = viewState === VIEW_STATES.DISCOVERY_QUIZ;

  return (
    <div className="w-full h-full bg-bg-base relative overflow-hidden flex flex-col select-none">
      {/* ─── Unified MapLibre 3D Globe & Map ─── */}
      <div className="absolute inset-0 z-0">
        <MapLibreGlobe
          onOpenItinerary={() => setItineraryOpen(true)}
          onOpenPacking={() => setPackingOpen(true)}
          onOpenCompare={() => setCompareOpen(true)}
        />
      </div>

      {/* ─── Floating Header & Search on Orbit View ─── */}
      <div
        className={`absolute inset-x-0 top-0 z-20 pointer-events-none flex flex-col items-center transition-all duration-700 ease-in-out ${
          isOverlayHidden ? 'opacity-0 -translate-y-3 pointer-events-none' : 'opacity-100 translate-y-0'
        }`}
      >
        {/* Centered Luxury Brand Header */}
        <div className="pt-8 sm:pt-10 pb-2 text-center pointer-events-auto flex flex-col items-center">
          <h1 className="font-brand text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[0.22em] text-white uppercase drop-shadow-md select-none">
            TRIPNEST
          </h1>
          <p className="text-text-secondary/80 text-[11px] sm:text-xs mt-1.5 font-body font-semibold tracking-[0.28em] uppercase select-none">
            Explore · Plan · Fly
          </p>
        </div>

        {/* Floating Search Bar */}
        {!quizActive && (
          <div className="w-full px-4 max-w-2xl mt-2 pointer-events-auto">
            <GlobeSearch />
          </div>
        )}
      </div>

      {/* ─── Discovery Quiz Overlay ─── */}
      <AnimatePresence>
        {viewState === VIEW_STATES.DISCOVERY_QUIZ && isFeatureEnabled('discovery-quiz') && (
          <Suspense fallback={null}>
            <DiscoveryQuiz />
          </Suspense>
        )}
      </AnimatePresence>

      {/* ─── Drawers (Itinerary, Packing, Compare) ─── */}
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
              destination={selectedDestination}
              weatherData={null}
              tripDays={tripDays}
              isOpen={packingOpen}
              onClose={() => setPackingOpen(false)}
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
    </div>
  );
}

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
