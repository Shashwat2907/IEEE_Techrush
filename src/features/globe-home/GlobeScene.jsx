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
const CLOUD_RADIUS = 1.018;

/* Atmosphere Rim Shader */
const AtmosphereRimShader = {
  uniforms: { color: { value: new THREE.Color('#60a5fa') } },
  vertexShader: `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    varying vec3 vNormal;
    void main() {
      float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.8);
      intensity = clamp(intensity, 0.0, 1.0);
      gl_FragColor = vec4(color, intensity * 0.6);
    }
  `,
};

/* Atmosphere Halo Shader */
const AtmosphereHaloShader = {
  uniforms: { color: { value: new THREE.Color('#3b82f6') } },
  vertexShader: `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    varying vec3 vNormal;
    void main() {
      float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.2);
      intensity = clamp(intensity, 0.0, 1.0);
      gl_FragColor = vec4(color, intensity * 0.7);
    }
  `,
};

/* Earth Sphere */
function EarthSphere({ quizActive }) {
  const meshRef = useRef();
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
      dayMap.anisotropy = 8;
    }
  }, [dayMap]);

  useFrame((_, delta) => {
    if (meshRef.current && !quizActive) meshRef.current.rotation.y += delta * 0.035;
    if (cloudsRef.current && !quizActive) cloudsRef.current.rotation.y += delta * 0.048;
  });

  const rimMaterial = useMemo(() => new THREE.ShaderMaterial({
    ...AtmosphereRimShader, transparent: true, blending: THREE.AdditiveBlending,
    side: THREE.FrontSide, depthWrite: false,
  }), []);

  const haloMaterial = useMemo(() => new THREE.ShaderMaterial({
    ...AtmosphereHaloShader, transparent: true, blending: THREE.AdditiveBlending,
    side: THREE.BackSide, depthWrite: false,
  }), []);

  return (
    <>
      <mesh ref={meshRef}>
        <sphereGeometry args={[GLOBE_RADIUS, 128, 128]} />
        <meshStandardMaterial
          map={dayMap} bumpMap={topoMap} bumpScale={0.03}
          roughnessMap={specularMap} roughness={0.4} metalness={0.05}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS * 1.008, 64, 64]} />
        <primitive object={rimMaterial} attach="material" />
      </mesh>
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[CLOUD_RADIUS, 96, 96]} />
        <meshStandardMaterial
          map={cloudsMap} transparent opacity={0.38}
          depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS * 1.15, 64, 64]} />
        <primitive object={haloMaterial} attach="material" />
      </mesh>
    </>
  );
}

/* Starfield */
function CosmicStarfield() {
  const { positions, colors } = useMemo(() => {
    const count = 2500;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [
      new THREE.Color('#ffffff'),
      new THREE.Color('#cbd5e1'),
      new THREE.Color('#e2e8f0'),
      new THREE.Color('#bfdbfe'),
    ];
    for (let i = 0; i < count; i++) {
      const radius = 35 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    return { positions, colors };
  }, []);

  const pointsRef = useRef();
  useFrame((state) => {
    if (pointsRef.current) pointsRef.current.rotation.y = state.clock.elapsedTime * 0.002;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.06} vertexColors transparent opacity={0.7} sizeAttenuation />
    </points>
  );
}

/* Subtle Destination Pin — small, palette-matching, no neon */
function DestinationPin({ destination, isTrending, isFiltered, onClick }) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef();

  const position = useMemo(
    () => latLngToVector3(destination.lat, destination.lng, GLOBE_RADIUS + 0.008),
    [destination.lat, destination.lng]
  );

  const opacity = isFiltered === false ? 0.1 : 1;
  const color = isTrending ? '#F59E0B' : '#94a3b8';

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerLeave={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
        onClick={(e) => { e.stopPropagation(); onClick(destination); }}
        scale={hovered ? 1.8 : 1}
      >
        <sphereGeometry args={[0.008, 12, 12]} />
        <meshStandardMaterial
          color={color} emissive={color}
          emissiveIntensity={hovered ? 2.0 : isTrending ? 0.8 : 0.3}
          transparent opacity={opacity}
        />
      </mesh>

      {hovered && (
        <Html position={[0, 0.035, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="glass text-white px-3 py-2 rounded-xl text-xs font-body whitespace-nowrap shadow-2xl">
            <span className="font-semibold text-sm">{destination.name}</span>
            {isTrending && (
              <span className="ml-2 text-[10px] text-accent-amber bg-accent-amber/10 px-1.5 py-0.5 rounded-full">
                Trending
              </span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

/* All destination pins */
function DestinationPins({ onPinClick }) {
  const { filters } = useFilters();
  const allDestinations = useMemo(() => getDestinations(), []);
  const trendingIds = useMemo(() => new Set(getTrendingDestinations().map(d => d.id)), []);

  const filteredIds = useMemo(() => {
    if (!filters.types.length && !filters.seasons.length && !filters.budgetTier && !filters.crowdLevel) return null;
    const filtered = getDestinations({
      type: filters.types.length ? filters.types : undefined,
      season: filters.seasons.length ? filters.seasons : undefined,
      budgetTier: filters.budgetTier, crowdLevel: filters.crowdLevel,
    });
    return new Set(filtered.map(d => d.id));
  }, [filters]);

  return (
    <group>
      {allDestinations.map(dest => (
        <DestinationPin
          key={dest.id} destination={dest}
          isTrending={trendingIds.has(dest.id)}
          isFiltered={filteredIds === null ? null : filteredIds.has(dest.id)}
          onClick={onPinClick}
        />
      ))}
    </group>
  );
}

/* Lighting */
function GlobeLighting() {
  return (
    <>
      <ambientLight intensity={0.7} color="#e0f2fe" />
      <directionalLight position={[5, 3, 5]} intensity={2.8} color="#ffffff" />
      <directionalLight position={[-5, -2, -3]} intensity={0.7} color="#60a5fa" />
      <directionalLight position={[0, -4, 2]} intensity={0.3} color="#bfdbfe" />
    </>
  );
}

/* Camera Controller — preserving all existing animation logic */
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
      flightDuration.current = 1.5 + (angle / Math.PI) * 2.0;
    }
  }, [isTransitioning, flightTarget, isReversingTransition, camera, flightStartPos]);

  useEffect(() => {
    if (isReversingTransition && flightTarget && !flightStartPos) {
      const targetPos = new THREE.Vector3(...latLngToVector3(flightTarget.lat, flightTarget.lng, CLOUD_RADIUS - 0.01));
      camera.position.copy(targetPos);
      camera.lookAt(0, 0, 0);
      setFlightStartPos(targetPos.clone());
      flightProgress.current = 0;
      flightDuration.current = 1.5;
    }
  }, [isReversingTransition, flightTarget, camera, flightStartPos]);

  useEffect(() => {
    if (!isTransitioning && !isReversingTransition) {
      setFlightStartPos(null);
      targetCamPos.current.copy(camera.position);
    }
  }, [isTransitioning, isReversingTransition, camera.position]);

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
      const zoomSpeed = 0.00075;
      const zoomFactor = Math.exp(event.deltaY * zoomSpeed);
      const currentDistance = camera.position.length();
      const newDistance = THREE.MathUtils.clamp(currentDistance * zoomFactor, 1.15, 4.0);
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
      if (t >= 1) { arriveAtDestination(flightTarget); setFlightStartPos(null); }
    } else if (isReversingTransition && flightTarget && flightStartPos) {
      if (controlsRef.current) controlsRef.current.enabled = false;
      flightProgress.current += delta / flightDuration.current;
      const t = Math.min(flightProgress.current, 1);
      const easeT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const startDir = flightStartPos.clone().normalize();
      const currentRadius = CLOUD_RADIUS - 0.01 + (2.5 - (CLOUD_RADIUS - 0.01)) * easeT;
      camera.position.copy(startDir.multiplyScalar(currentRadius));
      camera.lookAt(0, 0, 0);
      if (t >= 1) { navigateToGlobe(false); setFlightStartPos(null); }
    } else {
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
        controlsRef.current.autoRotate = !quizActive && !isCustomZooming.current;
      }
      if (isCustomZooming.current) {
        camera.position.lerp(targetCamPos.current, 0.08);
        camera.lookAt(0, 0, 0);
        if (camera.position.distanceTo(targetCamPos.current) < 0.005) isCustomZooming.current = false;
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef} enablePan={false} enableZoom={false}
      minDistance={1.15} maxDistance={4.0}
      autoRotate={!quizActive} autoRotateSpeed={0.4}
      enableDamping dampingFactor={0.06} rotateSpeed={0.5}
    />
  );
}

function GlobeContent({ onPinClick, quizActive }) {
  return (
    <>
      <GlobeLighting />
      <CosmicStarfield />
      <CameraController quizActive={quizActive} />
      <EarthSphere quizActive={quizActive} />
      <DestinationPins onPinClick={onPinClick} />
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
    } catch { setWebglError(true); }
  }, []);

  if (webglError) return <WebGLFallback />;

  return (
    <ErrorBoundary name="Globe" fallback={<WebGLFallback />}>
      <div className="relative w-full h-full bg-bg-base">
        <div className="absolute inset-0 z-0">
          <Suspense fallback={<GlobeLoadingSkeleton />}>
            <Canvas
              camera={{ position: [0, 0, 2.4], fov: 45 }}
              gl={{ antialias: true, alpha: true }}
              dpr={[1, 2]}
              style={{
                opacity: quizActive ? 0.25 : 1,
                transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                filter: quizActive ? 'blur(3px)' : 'none',
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

function WebGLFallback() {
  return (
    <div className="relative w-full h-full bg-bg-base overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-text-secondary text-sm font-mono">WebGL unavailable</div>
      </div>
    </div>
  );
}
