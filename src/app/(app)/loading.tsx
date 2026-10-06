export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy aria-label="Loading">
      <div className="h-6 w-48 rounded bg-subtle" />
      <div className="h-36 rounded-md border border-line bg-subtle" />
      <div className="h-56 rounded-md border border-line bg-subtle" />
    </div>
  );
}
