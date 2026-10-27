/** A full navigation refresh is intentional when a mutation's result is ambiguous. */
export function MutationStatusCheck({
  href,
  children = "Periksa apakah perubahan sudah tersimpan",
}) {
  return (
    <a
      href={href}
      className="mt-2 inline-flex min-h-9 items-center rounded-md font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
    >
      {children}
    </a>
  );
}
