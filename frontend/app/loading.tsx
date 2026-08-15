export default function Loading() {
  return <main className="route-loading" aria-live="polite" aria-busy="true">
    <span className="loading-orbit" aria-hidden="true" />
    <p>Loading NEXUM...</p>
  </main>;
}
