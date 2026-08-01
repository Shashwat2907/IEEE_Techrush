import { useRef, useMemo, useState, useEffect, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { OrbitControls, Html, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { latLngToVector3, getCurrentSeason } from '../../utils/globeMath';
import { getDestinations, getTrendingDestinations } from '../../services/destinations';
import { useFilters } from '../../context/FilterContext';
import { useApp, VIEW_STATES } from '../../context/AppContext';
import { GlobeLoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import ErrorBoundary from '../../components/ui/ErrorBoundary';
import { TEXTURES } from '../../config/api';

const GLOBE_RADIUS = 1;
const CLOUD_RADIUS = 1.02;

/**
 * The earth sphere with satellite texture
 * Uses TextureLoader directly for resilience — falls back to a colored sphere if textures fail
 */
function EarthSphere({ quizActive }) {
  const meshRef = useRef();
  const cloudsRef = useRef();
  const [earthMap, setEarthMap] = useState(null);
  const [cloudMap, setCloudMap] = useState(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();

    // Load earth texture
    loader.load(
      TEXTURES.EARTH_DAY,
      (texture) => { texture.colorSpace = THREE.SRGBColorSpace; setEarthMap(texture); },
      undefined,
      (err) => console.warn('Earth texture failed to load:', err)
    );

    // Load cloud texture
    loader.load(
      TEXTURES.CLOUDS,
      (texture) => setCloudMap(texture),
      undefined,
      (err) => console.warn('Cloud texture failed to load:', err)
    );
  }, []);

  // Auto-rotate when idle
  useFrame((_, delta) => {
    if (meshRef.current && !quizActive) {
      meshRef.current.rotation.y += delta * 0.05;
    }
    if (cloudsRef.current && !quizActive) {
      cloudsRef.current.rotation.y += delta * 0.03;
    }
  });

  return (
    <>
      {/* Earth */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        {earthMap ? (
          <meshStandardMaterial
            map={earthMap}
            metalness={0.1}
            roughness={0.7}
          />
        ) : (
          <meshStandardMaterial
            color="#1a4a3a"
            metalness={0.3}
            roughness={0.6}
            wireframe={false}
          />
        )}
      </mesh>

      {/* Cloud layer */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[CLOUD_RADIUS, 64, 64]} />
        {cloudMap ? (
          <meshStandardMaterial
            map={cloudMap}
            transparent
            opacity={0.25}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        ) : (
          <meshStandardMaterial
            color="#ffffff"
            transparent
            opacity={0.05}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        )}
      </mesh>
    </>
  );
}

/**
 * A single destination pin on the globe
 */
function DestinationPin({ destination, isTrending, isFiltered, onClick }) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef();
  const glowRef = useRef();

  const position = useMemo(
    () => latLngToVector3(destination.lat, destination.lng, GLOBE_RADIUS + 0.01),
    [destination.lat, destination.lng]
  );

  const normal = useMemo(() => {
    const v = new THREE.Vector3(...position).normalize();
    return v;
  }, [position]);

  // Pulse animation for trending pins
  useFrame((state) => {
    if (glowRef.current && isTrending) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
      glowRef.current.scale.setScalar(scale);
    }
  });

  // Determine opacity based on filter state
  const opacity = isFiltered === false ? 0.15 : 1;

  // Color based on crowd level
  const color = useMemo(() => {
    if (isTrending) return '#C9A227'; // accent-ochre
    switch (destination.crowdLevel) {
      case 'low': return '#5B8A5A';
      case 'high': return '#A34530';
      default: return '#4C8C86'; // accent-trail
    }
  }, [destination.crowdLevel, isTrending]);

  return (
    <group position={position}>
      {/* Pin dot */}
      <mesh
        ref={meshRef}
        onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerLeave={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
        onClick={(e) => { e.stopPropagation(); onClick(destination); }}
        scale={hovered ? 1.5 : 1}
      >
        <sphereGeometry args={[0.012, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 2 : isTrending ? 1 : 0.5}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Glow ring for trending */}
      {isTrending && (
        <mesh ref={glowRef} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.015, 0.025, 32]} />
          <meshBasicMaterial
            color="#C9A227"
            transparent
            opacity={0.4 * opacity}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Hover label */}
      {hovered && (
        <Html
          position={[0, 0.04, 0]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-surface/95 backdrop-blur-sm text-text-primary px-3 py-1.5
            rounded-card text-xs font-body whitespace-nowrap border border-surface-raised
            shadow-lg shadow-black/30">
            <span className="font-display font-semibold">{destination.name}</span>
            <div className="flex items-center gap-2 mt-0.5 text-text-secondary">
              <span className="font-mono text-[10px]">
                {destination.lat.toFixed(1)}°, {destination.lng.toFixed(1)}°
              </span>
              {isTrending && (
                <span className="text-accent-ochre text-[10px]">● trending</span>
              )}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

/**
 * All destination pins on the globe
 */
function DestinationPins({ onPinClick }) {
  const { filters } = useFilters();
  const allDestinations = useMemo(() => getDestinations(), []);
  const trendingIds = useMemo(() => {
    const trending = getTrendingDestinations();
    return new Set(trending.map(d => d.id));
  }, []);

  const filteredIds = useMemo(() => {
    if (!filters.types.length && !filters.seasons.length && !filters.budgetTier && !filters.crowdLevel) {
      return null; // no filters active
    }
    const filtered = getDestinations({
      type: filters.types.length ? filters.types : undefined,
      season: filters.seasons.length ? filters.seasons : undefined,
      budgetTier: filters.budgetTier,
      crowdLevel: filters.crowdLevel,
    });
    return new Set(filtered.map(d => d.id));
  }, [filters]);

  return (
    <group>
      {allDestinations.map(dest => (
        <DestinationPin
          key={dest.id}
          destination={dest}
          isTrending={trendingIds.has(dest.id)}
          isFiltered={filteredIds === null ? null : filteredIds.has(dest.id)}
          onClick={onPinClick}
        />
      ))}
    </group>
  );
}

/**
 * Scene lighting
 */
function GlobeLighting() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} color="#FFF8E7" />
      <directionalLight position={[-3, -2, -4]} intensity={0.3} color="#4C8C86" />
      <pointLight position={[0, 0, 3]} intensity={0.4} color="#C9A227" />
    </>
  );
}

/**
 * Camera controller with auto-rotation and flight transition
 */
function CameraController({ quizActive }) {
  const { flightTarget, isTransitioning, isReversingTransition, arriveAtDestination, navigateToGlobe } = useApp();
  const controlsRef = useRef();
  const { camera } = useThree();
  const [flightStartPos, setFlightStartPos] = useState(null);
  const flightProgress = useRef(0);
  const flightDuration = useRef(2);

  // Setup flight when transitioning starts
  useEffect(() => {
    if (isTransitioning && flightTarget && !isReversingTransition && !flightStartPos) {
      setFlightStartPos(camera.position.clone());
      flightProgress.current = 0;
      
      const targetPos = new THREE.Vector3(...latLngToVector3(flightTarget.lat, flightTarget.lng, 2.5));
      const angle = camera.position.angleTo(targetPos);
      flightDuration.current = 1.5 + (angle / Math.PI) * 2.0; // 1.5s to 3.5s
    }
  }, [isTransitioning, flightTarget, isReversingTransition, camera, flightStartPos]);

  // Setup reverse flight when reversing
  useEffect(() => {
    if (isReversingTransition && flightTarget && !flightStartPos) {
      // Starting from inside clouds at target
      const targetPos = new THREE.Vector3(...latLngToVector3(flightTarget.lat, flightTarget.lng, CLOUD_RADIUS - 0.01));
      camera.position.copy(targetPos);
      camera.lookAt(0, 0, 0);
      
      setFlightStartPos(targetPos.clone());
      flightProgress.current = 0;
      flightDuration.current = 1.5;
    }
  }, [isReversingTransition, flightTarget, camera, flightStartPos]);

  // Reset state when not transitioning
  useEffect(() => {
    if (!isTransitioning && !isReversingTransition) {
      setFlightStartPos(null);
    }
  }, [isTransitioning, isReversingTransition]);

  useFrame((state, delta) => {
    if (isTransitioning && flightTarget && flightStartPos) {
      if (controlsRef.current) controlsRef.current.enabled = false;
      
      flightProgress.current += delta / flightDuration.current;
      const t = Math.min(flightProgress.current, 1);
      const easeT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      
      const targetOuterPos = new THREE.Vector3(...latLngToVector3(flightTarget.lat, flightTarget.lng, 2.5));
      const targetInnerPos = new THREE.Vector3(...latLngToVector3(flightTarget.lat, flightTarget.lng, CLOUD_RADIUS - 0.01));
      
      const startDir = flightStartPos.clone().normalize();
      const endDir = targetOuterPos.clone().normalize();
      const currentDir = startDir.clone().lerp(endDir, easeT).normalize();
      
      const startRadius = flightStartPos.length();
      const endRadius = targetInnerPos.length();
      const currentRadius = startRadius + (endRadius - startRadius) * easeT;
      
      camera.position.copy(currentDir.multiplyScalar(currentRadius));
      camera.lookAt(0, 0, 0);

      if (t >= 1) {
        arriveAtDestination(flightTarget);
        setFlightStartPos(null);
      }
    } else if (isReversingTransition && flightTarget && flightStartPos) {
      if (controlsRef.current) controlsRef.current.enabled = false;
      
      flightProgress.current += delta / flightDuration.current;
      const t = Math.min(flightProgress.current, 1);
      const easeT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      
      const startDir = flightStartPos.clone().normalize();
      const currentRadius = (CLOUD_RADIUS - 0.01) + (2.5 - (CLOUD_RADIUS - 0.01)) * easeT;
      
      camera.position.copy(startDir.multiplyScalar(currentRadius));
      camera.lookAt(0, 0, 0);
      
      if (t >= 1) {
        navigateToGlobe(false);
        setFlightStartPos(null);
      }
    } else {
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
        controlsRef.current.autoRotate = !quizActive;
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableZoom={true}
      minDistance={CLOUD_RADIUS + 0.1}
      maxDistance={4}
      autoRotate={!quizActive}
      autoRotateSpeed={0.5}
      enableDamping
      dampingFactor={0.05}
      rotateSpeed={0.5}
    />
  );
}

/**
 * Inner canvas content
 */
function GlobeContent({ onPinClick, quizActive }) {
  return (
    <>
      <GlobeLighting />
      <CameraController quizActive={quizActive} />
      <EarthSphere quizActive={quizActive} />
      <DestinationPins onPinClick={onPinClick} />

      {/* Background stars */}
      <mesh>
        <sphereGeometry args={[50, 32, 32]} />
        <meshBasicMaterial color="#0a0f0c" side={THREE.BackSide} />
      </mesh>
    </>
  );
}

/**
 * Main Globe Scene component
 */
export default function GlobeScene() {
  const { viewState, flyToDestination, showQuiz } = useApp();
  const quizActive = viewState === VIEW_STATES.DISCOVERY_QUIZ;
  const [webglError, setWebglError] = useState(false);

  const handlePinClick = useCallback((destination) => {
    flyToDestination(destination);
  }, [flyToDestination]);

  // WebGL fallback check
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) setWebglError(true);
    } catch {
      setWebglError(true);
    }
  }, []);

  if (webglError) {
    return <WebGLFallback onPinClick={handlePinClick} />;
  }

  return (
    <ErrorBoundary name="Globe" fallback={<WebGLFallback onPinClick={handlePinClick} />}>
      <div className="relative w-full h-full">
        {/* Three.js Canvas */}
        <div className="absolute inset-0 z-0">
          <Suspense fallback={<GlobeLoadingSkeleton />}>
            <Canvas
              camera={{ position: [0, 0, 2.5], fov: 45 }}
              gl={{ antialias: true, alpha: true }}
              dpr={[1, 2]}
              style={{
                opacity: quizActive ? 0.3 : 1,
                transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                filter: quizActive ? 'blur(2px)' : 'none',
              }}
            >
              <GlobeContent onPinClick={handlePinClick} quizActive={quizActive} />
            </Canvas>
          </Suspense>
        </div>
      </div>
    </ErrorBoundary>
  );
}

/**
 * WebGL fallback — flat world map with search/filter
 */
function WebGLFallback({ onPinClick }) {
  const destinations = useMemo(() => getDestinations(), []);

  return (
    <div className="relative w-full h-full bg-bg-base overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_der_Grinten_projection_SW.jpg/1280px-Van_der_Grinten_projection_SW.jpg"
          alt="World Map"
          className="max-w-full max-h-full object-contain opacity-30"
        />
      </div>
      <div className="absolute bottom-4 left-4 text-text-secondary text-xs font-mono">
        WebGL unavailable — showing flat map
      </div>
    </div>
  );
}
