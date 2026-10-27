export function PortalLoadingFrame({
  children,
  label = "Memuat halaman pengelola",
}) {
  return (
    <div aria-busy="true" className="min-w-0">
      <span className="sr-only" role="status">
        {label}
      </span>
      {children}
    </div>
  );
}
