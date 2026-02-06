export function LoadingSpinner({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="spinner" />
      {text && (
        <p className="text-sm text-text-secondary animate-pulse">{text}</p>
      )}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-surface rounded-2xl p-6 shadow-sm border border-border">
      <div className="skeleton h-5 w-3/4 mb-4" />
      <div className="skeleton h-4 w-full mb-2" />
      <div className="skeleton h-4 w-5/6 mb-4" />
      <div className="skeleton h-9 w-32" />
    </div>
  );
}

export function SkeletonBlueprint() {
  return (
    <div className="bg-surface rounded-2xl p-6 shadow-sm border border-border">
      <div className="skeleton h-6 w-1/2 mb-6" />
      <div className="skeleton h-4 w-full mb-2" />
      <div className="skeleton h-4 w-full mb-2" />
      <div className="skeleton h-4 w-4/5 mb-2" />
      <div className="skeleton h-4 w-full mb-2" />
      <div className="skeleton h-4 w-3/4 mb-6" />
      <div className="skeleton h-4 w-full mb-2" />
      <div className="skeleton h-4 w-5/6 mb-2" />
      <div className="skeleton h-4 w-full mb-2" />
    </div>
  );
}
