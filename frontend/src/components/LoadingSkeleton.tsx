export interface LoadingSkeletonProps {
  type?: 'card' | 'list' | 'detail';
}

export function LoadingSkeleton({ type = 'card' }: LoadingSkeletonProps) {
  if (type === 'card') {
    return (
      <div className="card p-4 space-y-3">
        <div className="skeleton-title"></div>
        <div className="skeleton-text"></div>
        <div className="skeleton-text w-1/2"></div>
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-4 space-y-3">
            <div className="skeleton-title w-2/3"></div>
            <div className="skeleton-text"></div>
            <div className="skeleton-text w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="skeleton-title"></div>
      <div className="skeleton-text"></div>
      <div className="skeleton-text w-3/4"></div>
    </div>
  );
}