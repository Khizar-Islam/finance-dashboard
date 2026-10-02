export function ErrorState({
  message = "Something went wrong.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <p className="font-mono text-xs text-brick mb-3">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="font-mono text-xs bg-[#E6DCC5] text-ink px-4 py-2 rounded-md hover:brightness-95 transition-all"
        >
          Try again
        </button>
      )}
    </div>
  );
}