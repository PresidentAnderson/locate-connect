export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-cyan-600 to-teal-600 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/20 backdrop-blur" />
            <span className="text-2xl font-bold text-white">
              LocateConnect
            </span>
          </div>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-white">
            Find Missing Persons.<br />
            Connect Communities.
          </h1>
          <p className="text-lg text-white/80">
            A secure platform for reporting and tracking missing persons cases
            with real-time coordination between families and law enforcement.
          </p>
          <div className="flex items-center gap-4 text-white/60 text-sm">
            <span>🔒 Secure & Private</span>
            <span>•</span>
            <span>🌐 EN/FR Bilingual</span>
            <span>•</span>
            <span>⚡ Real-time Updates</span>
          </div>
        </div>

        <div className="text-white/60 text-sm">
          © 2024 Jonathan Anderson Investigational Corporation
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
