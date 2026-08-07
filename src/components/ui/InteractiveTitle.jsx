import { useState, useRef, useCallback } from 'react';
import { motion, useSpring } from 'framer-motion';

const LETTERS = ['T', 'R', 'I', 'P', 'N', 'E', 'S', 'T'];

function ShatterLetter({ char, index, mousePos, isHovered, containerWidth }) {
  const letterFraction = (index + 0.5) / LETTERS.length;
  const letterCenterX = containerWidth * letterFraction;

  const dx = mousePos.x - letterCenterX;
  const dy = mousePos.y;
  const dist = Math.hypot(dx, dy);

  const maxRepelDist = 160;
  const repelForce = Math.max(0, 1 - dist / maxRepelDist);

  // Magnetic vertical displacement: letters shatter vertically away from mouse Y
  const targetY = isHovered ? (dy >= 0 ? -1 : 1) * repelForce * 32 + (index % 2 === 0 ? -1 : 1) * 8 * repelForce : 0;
  const targetRotateX = isHovered ? (dy >= 0 ? 20 : -20) * repelForce : 0;
  const targetSkewY = isHovered ? (dx >= 0 ? -10 : 10) * repelForce : 0;
  const targetScale = isHovered ? 1 + repelForce * 0.1 : 1;

  const springConfig = { stiffness: 350, damping: 24, mass: 0.5 };
  const y = useSpring(targetY, springConfig);
  const rotateX = useSpring(targetRotateX, springConfig);
  const skewY = useSpring(targetSkewY, springConfig);
  const scale = useSpring(targetScale, springConfig);

  return (
    <motion.span
      style={{
        y,
        rotateX,
        skewY,
        scale,
        transformPerspective: 600,
        display: 'inline-block',
      }}
      className={`relative font-display text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight select-none uppercase leading-none transition-colors duration-150 ${
        isHovered && repelForce > 0.2
          ? 'text-emerald-400 dark:text-emerald-400 light:text-emerald-600 drop-shadow-[0_4px_16px_rgba(16,185,129,0.5)]'
          : 'text-white dark:text-white light:text-zinc-950'
      }`}
    >
      {char}
    </motion.span>
  );
}

export default function InteractiveTitle() {
  const containerRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [containerWidth, setContainerWidth] = useState(400);

  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setContainerWidth(rect.width);
    const x = e.clientX - rect.left;
    const y = e.clientY - (rect.top + rect.height / 2);
    setMousePos({ x, y });
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setMousePos({ x: 0, y: 0 });
      }}
      onMouseMove={handleMouseMove}
      className="relative inline-flex items-center justify-center cursor-pointer py-2 px-2 select-none"
    >
      <div className="flex items-center justify-center gap-0 sm:gap-1">
        {LETTERS.map((char, idx) => (
          <ShatterLetter
            key={idx}
            char={char}
            index={idx}
            mousePos={mousePos}
            isHovered={isHovered}
            containerWidth={containerWidth}
          />
        ))}
      </div>
    </div>
  );
}
