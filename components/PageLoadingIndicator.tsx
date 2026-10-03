export function PageLoadingIndicator() {
  return (
    <main className="page-loading" aria-busy="true">
      <div className="page-loading__status" role="status" aria-live="polite">
        <span className="page-loading__spinner" aria-hidden="true" />
        <span>Loading page</span>
      </div>
    </main>
  );
}
