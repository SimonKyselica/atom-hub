export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="pt-safe mx-auto flex min-h-dvh w-full max-w-[340px] flex-col justify-center px-4 py-10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.svg" alt="" width={48} height={48} className="mx-auto mb-6 rounded-xl" />
      {children}
    </main>
  );
}
