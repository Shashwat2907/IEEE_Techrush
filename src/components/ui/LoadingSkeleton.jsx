export function GlobeLoadingSkeleton() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-bg-base">
      <div className="relative">
        <div className="w-32 h-32 rounded-full bg-white/5 animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-text-secondary text-xs font-mono">Loading globe...</span>
        </div>
      </div>
    </div>
  );
}

export function LoadingSkeleton({ type = 'card' }) {
  if (type === 'panel') {
    return (
      <div className="w-full max-w-sm mx-auto p-6 space-y-4">
        <div className="skeleton-postcard h-8 w-3/4" />
        <div className="skeleton-postcard h-4 w-full" />
        <div className="skeleton-postcard h-4 w-5/6" />
        <div className="skeleton-postcard h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="skeleton-postcard h-24 w-full" />
  );
}
