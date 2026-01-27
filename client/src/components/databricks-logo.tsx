export function AngloStrataLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex items-center justify-center w-10 h-10">
        <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
          <rect x="4" y="24" width="32" height="5" rx="1" fill="currentColor" opacity="0.4" />
          <rect x="6" y="16" width="28" height="5" rx="1" fill="currentColor" opacity="0.7" />
          <rect x="8" y="8" width="24" height="5" rx="1" fill="currentColor" />
          <rect x="16" y="4" width="8" height="32" rx="1" fill="#FF0000" />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-bold leading-tight tracking-tight">Anglo Strata</span>
        <span className="text-[10px] uppercase tracking-widest opacity-70 leading-tight">Layers of Data</span>
      </div>
    </div>
  );
}

export function AngloStrataIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none">
      <rect x="4" y="24" width="32" height="5" rx="1" fill="currentColor" opacity="0.4" />
      <rect x="6" y="16" width="28" height="5" rx="1" fill="currentColor" opacity="0.7" />
      <rect x="8" y="8" width="24" height="5" rx="1" fill="currentColor" />
      <rect x="16" y="4" width="8" height="32" rx="1" fill="#FF0000" />
    </svg>
  );
}

export function DatabricksLogo({ className = "h-6 w-6" }: { className?: string }) {
  return <AngloStrataIcon className={className} />;
}

export function DatabricksWordmark({ className = "" }: { className?: string }) {
  return <AngloStrataLogo className={className} />;
}
