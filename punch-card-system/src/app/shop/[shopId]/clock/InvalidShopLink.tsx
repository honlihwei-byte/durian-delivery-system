export function InvalidShopLink() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Invalid shop link</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        This QR code or link is missing a valid shop id. Ask your manager to print a new shop QR code
        from the admin panel.
      </p>
    </div>
  );
}
