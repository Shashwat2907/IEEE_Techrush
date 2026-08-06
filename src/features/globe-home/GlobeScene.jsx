import { useRef, useMemo, useState, useEffect, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { latLngToVector3 } from '../../utils/globeMath';
import { useApp, VIEW_STATES } from '../../context/AppContext';
import { useFilters } from '../../context/FilterContext';
import { getDestinations, getTrendingDestinations } from '../../services/destinations';
import { TEXTURES } from '../../config/api';
import ErrorBoundary from '../../components/ui/ErrorBoundary';
import { GlobeLoadingSkeleton } from '../../components/ui/LoadingSkeleton';

const GLOBE_RADIUS = 1.0;
const CLOUD_RADIUS = 1.012;

/* Atmospheric Rayleigh Scattering Rim Shader (Soft Google Earth glow) */
const AtmosphereRimShader = {
  uniforms: {
    color: { value: new THREE.Color('#38bdf8') },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * vec4(vPosition, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vec3 viewDir = normalize(-vPosition);
      float rim = 1.0 - max(0.0, dot(vNormal, viewDir));
      float intensity = pow(rim, 3.6) * 0.75;
      intensity = clamp(intensity, 0.0, 0.85);
      gl_FragColor = vec4(color, intensity);
    }
  `,
};

/* Earth Sphere & Atmosphere Layers */
function EarthMesh() {
  const cloudsRef = useRef();

  const [dayMap, topoMap, specularMap, cloudsMap] = useTexture([
    TEXTURES.EARTH_DAY,
    TEXTURES.EARTH_TOPO,
    TEXTURES.EARTH_SPECULAR,
    TEXTURES.CLOUDS,
  ]);

  useMemo(() => {
    if (dayMap) {
      dayMap.colorSpace = THREE.SRGBColorSpace;
      dayMap.anisotropy = 16;
    }
    if (cloudsMap) {
      cloudsMap.colorSpace = THREE.SRGBColorSpace;
      cloudsMap.anisotropy = 8;
    }
  }, [dayMap, cloudsMap]);

  useFrame((_, delta) => {
    // Subtle relative cloud drift
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.006;
    }
  });

  const rimMaterial = useMemo(() => new THREE.ShaderMaterial({
    ...AtmosphereRimShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    depthWrite: false,
  }), []);

  return (
    <>
      {/* Base Earth Planet */}
      <mesh receiveShadow castShadow>
        <sphereGeometry args={[GLOBE_RADIUS, 128, 128]} />
        <meshStandardMaterial
          map={dayMap}
          bumpMap={topoMap}
          bumpScale={0.015}
          roughnessMap={specularMap}
          roughness={0.68}
          metalness={0.04}
        />
      </mesh>

      {/* Atmospheric Rim hugging the sphere */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS * 1.004, 64, 64]} />
        <primitive object={rimMaterial} attach="material" />
      </mesh>

      {/* Clouds Layer */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[CLOUD_RADIUS, 96, 96]} />
        <meshStandardMaterial
          map={cloudsMap}
          transparent
          opacity={0.28}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
    </>
  );
}

/* Cosmic Deep-Space Starfield */
function CosmicStarfield() {
  const { positions, colors } = useMemo(() => {
    const count = 3000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [
      new THREE.Color('#ffffff'),
      new THREE.Color('#e0f2fe'),
      new THREE.Color('#bae6fd'),
      new THREE.Color('#cbd5e1'),
    ];
    for (let i = 0; i < count; i++) {
      const radius = 40 + Math.random() * 45;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return { positions, colors };
  }, []);

  const pointsRef = useRef();
  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.001;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.055} vertexColors transparent opacity={0.65} sizeAttenuation />
    </points>
  );
}

/* Scalable Intelligent Destination Pin */
function DestinationPin({ destination, isTrending, isFiltered, isProminent, onClick }) {
  const [hovered, setHovered] = useState(false);
  const { camera } = useThree();
  const [visible, setVisible] = useState(true);

  const localPos = useMemo(
    () => latLngToVector3(destination.lat, destination.lng, GLOBE_RADIUS + 0.006),
    [destination.lat, destination.lng]
  );

  const posVec = useMemo(() => new THREE.Vector3(...localPos), [localPos]);

  // Backface occlusion culling: check if facing the camera
  useFrame(() => {
    const camDir = camera.position.clone().normalize();
    const pinDir = posVec.clone().normalize();
    const dot = pinDir.dot(camDir);
    // If dot < 0.12, the pin is on the back or limb of the sphere
    setVisible(dot > 0.12);
  });

  if (!visible) return null;

  const color = isTrending ? '#F59E0B' : '#38BDF8';
  const size = isTrending || isProminent ? 0.009 : 0.0065;

  return (
    <group position={localPos}>
      {/* Outer subtle glow ring for trending / prominent destinations */}
      {(isTrending || isProminent) && (
        <mesh scale={hovered ? 2.6 : 1.8}>
          <ringGeometry args={[0.008, 0.012, 24]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={hovered ? 0.8 : 0.35}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Core Pin Sphere */}
      <mesh
        onPointerEnter={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerLeave={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick(destination);
        }}
        scale={hovered ? 2.2 : 1}
      >
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 2.5 : isTrending ? 1.2 : 0.6}
          roughness={0.3}
          transparent
          opacity={isFiltered === false ? 0.15 : 1}
        />
      </mesh>

      {/* Interactive Tooltip Card */}
      {hovered && (
        <Html position={[0, 0.045, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="glass text-white px-3.5 py-2.5 rounded-2xl text-xs font-body whitespace-nowrap shadow-2xl border border-white/15 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-wide font-display">{destination.name}</span>
              {isTrending && (
                <span className="text-[10px] text-accent-amber font-mono bg-accent-amber/15 border border-accent-amber/30 px-1.5 py-0.5 rounded-full">
                  TRENDING
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-text-secondary font-mono">
              <span>{destination.bestTimeToVisit || ''}</span>
              <span>·</span>
              <span className="capitalize">{destination.budgetTier}</span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

/* Scalable Pins Container with LOD filtering */
function DestinationPins({ onPinClick }) {
  const { filters } = useFilters();
  const { camera } = useThree();
  const [camDist, setCamDist] = useState(2.4);

  const allDestinations = useMemo(() => getDestinations(), []);
  const trendingIds = useMemo(() => new Set(getTrendingDestinations().map(d => d.id)), []);

  useFrame(() => {
    setCamDist(camera.position.length());
  });

  const filteredIds = useMemo(() => {
    if (!filters.types.length && !filters.seasons.length && !filters.budgetTier && !filters.crowdLevel) return null;
    const filtered = getDestinations({
      type: filters.types.length ? filters.types : undefined,
      season: filters.seasons.length ? filters.seasons : undefined,
      budgetTier: filters.budgetTier,
      crowdLevel: filters.crowdLevel,
    });
    return new Set(filtered.map(d => d.id));
  }, [filters]);

  // Scalable LOD Strategy:
  // - High distance (> 2.3): show trending + top featured + active filtered matches
  // - Close distance (<= 2.3): show all pins
  const visibleDestinations = useMemo(() => {
    if (filteredIds !== null) {
      return allDestinations.filter(d => filteredIds.has(d.id));
    }
    if (camDist > 2.2) {
      return allDestinations.filter(d => trendingIds.has(d.id) || ['bali-id', 'kyoto-jp', 'santorini-gr', 'reykjavik-is', 'paris-fr', 'nyc-us', 'cairo-eg', 'tokyo-jp', 'rio-br', 'sydney-au'].includes(d.id));
    }
    return allDestinations;
  }, [allDestinations, filteredIds, camDist, trendingIds]);

  return (
    <group>
      {visibleDestinations.map(dest => (
        <DestinationPin
          key={dest.id}
          destination={dest}
          isTrending={trendingIds.has(dest.id)}
          isFiltered={filteredIds === null ? null : filteredIds.has(dest.id)}
          isProminent={trendingIds.has(dest.id)}
          onClick={onPinClick}
        />
      ))}
    </group>
  );
}

/* Realistic Google Earth Lighting */
function GlobeLighting() {
  return (
    <>
      <ambientLight intensity={0.7} color="#ffffff" />
      {/* Sunlight */}
      <directionalLight
        position={[6, 4, 5]}
        intensity={2.2}
        color="#ffffff"
      />
      {/* Atmospheric space bounce */}
      <directionalLight
        position={[-6, -2, -4]}
        intensity={0.4}
        color="#93c5fd"
      />
    </>
  );
}

/* Synchronized Globe Group (Earth + Clouds + Pins all lock together) */
function SynchronizedGlobe({ onPinClick, quizActive }) {
  return (
    <group>
      <EarthMesh />
      <DestinationPins onPinClick={onPinClick} />
    </group>
  );
}

/* Camera Controller for Flight & Orbit Controls */
function CameraController({ quizActive }) {
  const { flightTarget, isTransitioning, isReversingTransition, arriveAtDestination, navigateToGlobe } = useApp();
  const controlsRef = useRef();
  const { camera, gl } = useThree();
  const [flightStartPos, setFlightStartPos] = useState(null);
  const flightProgress = useRef(0);
  const flightDuration = useRef(2);
  const targetCamPos = useRef(camera.position.clone());
  const isCustomZooming = useRef(false);

  useEffect(() => {
    if (isTransitioning && flightTarget && !isReversingTransition && !flightStartPos) {
      setFlightStartPos(camera.position.clone());
      flightProgress.current = 0;
      const targetPos = new THREE.Vector3(...latLngToVector3(flightTarget.lat, flightTarget.lng, 2.5));
      const angle = camera.position.angleTo(targetPos);
      flightDuration.current = 1.4 + (angle / Math.PI) * 1.8;
    }
  }, [isTransitioning, flightTarget, isReversingTransition, camera, flightStartPos]);

  useEffect(() => {
    if (isReversingTransition && flightTarget && !flightStartPos) {
      const targetPos = new THREE.Vector3(...latLngToVector3(flightTarget.lat, flightTarget.lng, CLOUD_RADIUS - 0.01));
      camera.position.copy(targetPos);
      camera.lookAt(0, 0, 0);
      setFlightStartPos(targetPos.clone());
      flightProgress.current = 0;
      flightDuration.current = 1.4;
    }
  }, [isReversingTransition, flightTarget, camera, flightStartPos]);

  useEffect(() => {
    if (!isTransitioning && !isReversingTransition) {
      setFlightStartPos(null);
      targetCamPos.current.copy(camera.position);
    }
  }, [isTransitioning, isReversingTransition, camera.position]);

  // Smooth mouse wheel zoom toward sphere intersection
  useEffect(() => {
    const domElement = gl.domElement;
    if (!domElement) return;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const earthSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), GLOBE_RADIUS);
    const hitPoint = new THREE.Vector3();

    const handleWheel = (event) => {
      if (isTransitioning || isReversingTransition) return;
      event.preventDefault();
      const rect = domElement.getBoundingClientRect();
      ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const zoomSpeed = 0.0008;
      const zoomFactor = Math.exp(event.deltaY * zoomSpeed);
      const currentDistance = camera.position.length();
      const newDistance = THREE.MathUtils.clamp(currentDistance * zoomFactor, 1.15, 4.2);
      const actualFactor = newDistance / currentDistance;
      const hasIntersection = raycaster.ray.intersectSphere(earthSphere, hitPoint);

      if (hasIntersection && actualFactor < 1) {
        const hitDir = hitPoint.clone().normalize();
        const currentDir = camera.position.clone().normalize();
        const steerStrength = Math.min((1 - actualFactor) * 0.8, 0.25);
        const nextDir = currentDir.lerp(hitDir, steerStrength).normalize();
        targetCamPos.current.copy(nextDir.multiplyScalar(newDistance));
      } else {
        const currentDir = camera.position.clone().normalize();
        targetCamPos.current.copy(currentDir.multiplyScalar(newDistance));
      }
      isCustomZooming.current = true;
    };

    domElement.addEventListener('wheel', handleWheel, { passive: false });
    return () => domElement.removeEventListener('wheel', handleWheel);
  }, [gl, camera, isTransitioning, isReversingTransition]);

  useFrame((_, delta) => {
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
      const currentRadius = CLOUD_RADIUS - 0.01 + (2.4 - (CLOUD_RADIUS - 0.01)) * easeT;
      camera.position.copy(startDir.multiplyScalar(currentRadius));
      camera.lookAt(0, 0, 0);
      if (t >= 1) {
        navigateToGlobe(false);
        setFlightStartPos(null);
      }
    } else {
      if (controlsRef.current) {
        controlsRef.current.enabled = !quizActive;
        controlsRef.current.autoRotate = !quizActive && !isCustomZooming.current;
      }
      if (isCustomZooming.current) {
        camera.position.lerp(targetCamPos.current, 0.08);
        camera.lookAt(0, 0, 0);
        if (camera.position.distanceTo(targetCamPos.current) < 0.005) {
          isCustomZooming.current = false;
        }
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableZoom={false}
      minDistance={1.15}
      maxDistance={4.2}
      autoRotate={!quizActive}
      autoRotateSpeed={0.35}
      enableDamping
      dampingFactor={0.06}
      rotateSpeed={0.55}
    />
  );
}

function GlobeContent({ onPinClick, quizActive }) {
  return (
    <>
      <GlobeLighting />
      <CosmicStarfield />
      <CameraController quizActive={quizActive} />
      <SynchronizedGlobe onPinClick={onPinClick} quizActive={quizActive} />
    </>
  );
}

export default function GlobeScene() {
  const { viewState, flyToDestination } = useApp();
  const quizActive = viewState === VIEW_STATES.DISCOVERY_QUIZ;
  const [webglError, setWebglError] = useState(false);

  const handlePinClick = useCallback((destination) => {
    flyToDestination(destination);
  }, [flyToDestination]);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) setWebglError(true);
    } catch {
      setWebglError(true);
    }
  }, []);

  if (webglError) return <WebGLFallback />;

  return (
    <ErrorBoundary name="Globe" fallback={<WebGLFallback />}>
      <div className="absolute inset-0 w-full h-full bg-transparent overflow-hidden">
        <Suspense fallback={<GlobeLoadingSkeleton />}>
          <Canvas
            camera={{ position: [0, 0, 2.4], fov: 45 }}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            dpr={[1, 2]}
            style={{
              width: '100%',
              height: '100%',
              opacity: quizActive ? 0.25 : 1,
              transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
              filter: quizActive ? 'blur(3px)' : 'none',
            }}
          >
            <GlobeContent onPinClick={handlePinClick} quizActive={quizActive} />
          </Canvas>
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}

function WebGLFallback() {
  return (
    <div className="relative w-full h-full bg-bg-base overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-text-secondary text-sm font-mono">WebGL unavailable</div>
      </div>
    </div>
  );
}
