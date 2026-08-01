export function LoadingSkeleton({ type = 'card', count = 1 }) {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  if (type === 'postcard') {
    return skeletons.map(i => (
      <div key={i} className="skeleton-postcard w-full h-32 topo-bg" />
    ));
  }

  if (type === 'panel') {
    return (
      <div className="space-y-4 p-4">
        <div className="skeleton-postcard w-3/4 h-6 rounded" />
        <div className="skeleton-postcard w-full h-4 rounded" />
        <div className="skeleton-postcard w-full h-4 rounded" />
        <div className="skeleton-postcard w-5/6 h-4 rounded" />
        <div className="skeleton-postcard w-full h-24 rounded-card mt-4" />
      </div>
    );
  }

  return skeletons.map(i => (
    <div key={i} className="skeleton-postcard rounded-card p-4 space-y-3">
      <div className="skeleton-postcard w-2/3 h-5 rounded" />
      <div className="skeleton-postcard w-full h-3 rounded" />
      <div className="skeleton-postcard w-4/5 h-3 rounded" />
    </div>
  ));
}

export function GlobeLoadingSkeleton() {
  return (
    <div className="flex items-center justify-center w-full h-full bg-bg-base">
      <div className="text-center">
        <div className="w-32 h-32 rounded-full border-2 border-accent-trail opacity-30 mx-auto mb-4 animate-pulse" />
        <p className="text-text-secondary font-mono text-sm animate-pulse">
          Loading globe...
        </p>
      </div>
    </div>
  );
}
