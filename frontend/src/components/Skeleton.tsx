export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-ink/10 rounded-md ${className}`} />;
}