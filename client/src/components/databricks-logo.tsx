export function LogoOption1({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex items-center justify-center w-10 h-10">
        <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
          <rect x="4" y="26" width="32" height="4" rx="1" fill="currentColor" opacity="0.3" />
          <rect x="6" y="18" width="28" height="4" rx="1" fill="currentColor" opacity="0.6" />
          <rect x="8" y="10" width="24" height="4" rx="1" fill="currentColor" />
          <rect x="16" y="6" width="8" height="28" rx="1" fill="#FF0000" />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-bold leading-tight tracking-tight">Anglo Strata</span>
        <span className="text-[10px] uppercase tracking-widest opacity-70 leading-tight">Layers of Data</span>
      </div>
    </div>
  );
}

export function LogoOption2({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex items-center justify-center w-10 h-10">
        <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
          <path d="M20 4L36 14V26L20 36L4 26V14L20 4Z" fill="currentColor" opacity="0.2" />
          <path d="M20 8L32 16V24L20 32L8 24V16L20 8Z" fill="currentColor" opacity="0.5" />
          <path d="M20 12L28 18V22L20 28L12 22V18L20 12Z" fill="currentColor" />
          <circle cx="20" cy="20" r="4" fill="#FF0000" />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-bold leading-tight tracking-tight">Anglo Strata</span>
        <span className="text-[10px] uppercase tracking-widest opacity-70 leading-tight">Layers of Data</span>
      </div>
    </div>
  );
}

export function LogoOption3({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex items-center justify-center w-10 h-10">
        <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
          <ellipse cx="20" cy="30" rx="16" ry="4" fill="currentColor" opacity="0.25" />
          <ellipse cx="20" cy="24" rx="14" ry="4" fill="currentColor" opacity="0.45" />
          <ellipse cx="20" cy="18" rx="12" ry="4" fill="currentColor" opacity="0.65" />
          <ellipse cx="20" cy="12" rx="10" ry="4" fill="currentColor" />
          <path d="M20 8L20 34" stroke="#FF0000" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-bold leading-tight tracking-tight">Anglo Strata</span>
        <span className="text-[10px] uppercase tracking-widest opacity-70 leading-tight">Layers of Data</span>
      </div>
    </div>
  );
}

export function LogoOption4({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex items-center justify-center w-10 h-10">
        <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
          <rect x="4" y="4" width="32" height="32" rx="4" fill="currentColor" opacity="0.1" />
          <path d="M8 28H32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
          <path d="M10 22H30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
          <path d="M12 16H28" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
          <path d="M14 10H26" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <circle cx="32" cy="8" r="5" fill="#FF0000" />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-bold leading-tight tracking-tight">Anglo Strata</span>
        <span className="text-[10px] uppercase tracking-widest opacity-70 leading-tight">Layers of Data</span>
      </div>
    </div>
  );
}

export function LogoOption5({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex items-center justify-center w-10 h-10">
        <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
          <path d="M6 32L20 6L34 32H6Z" fill="currentColor" opacity="0.15" />
          <path d="M10 28L20 12L30 28H10Z" fill="currentColor" opacity="0.4" />
          <path d="M14 24L20 16L26 24H14Z" fill="currentColor" opacity="0.7" />
          <path d="M17 21L20 17L23 21H17Z" fill="currentColor" />
          <circle cx="20" cy="10" r="3" fill="#FF0000" />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-bold leading-tight tracking-tight">Anglo Strata</span>
        <span className="text-[10px] uppercase tracking-widest opacity-70 leading-tight">Layers of Data</span>
      </div>
    </div>
  );
}

export function AngloStrataLogo({ className = "" }: { className?: string }) {
  return <LogoOption1 className={className} />;
}

export function AngloStrataIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none">
      <rect x="4" y="26" width="32" height="4" rx="1" fill="currentColor" opacity="0.3" />
      <rect x="6" y="18" width="28" height="4" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="8" y="10" width="24" height="4" rx="1" fill="currentColor" />
      <rect x="16" y="6" width="8" height="28" rx="1" fill="#FF0000" />
    </svg>
  );
}

export function DatabricksLogo({ className = "h-6 w-6" }: { className?: string }) {
  return <AngloStrataIcon className={className} />;
}

export function DatabricksWordmark({ className = "" }: { className?: string }) {
  return <AngloStrataLogo className={className} />;
}
