export function AngloStrataIconSvg({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none">
      <path d="M20 4L36 14V26L20 36L4 26V14L20 4Z" fill="currentColor" opacity="0.2" />
      <path d="M20 8L32 16V24L20 32L8 24V16L20 8Z" fill="currentColor" opacity="0.5" />
      <path d="M20 12L28 18V22L20 28L12 22V18L20 12Z" fill="currentColor" />
      <circle cx="20" cy="20" r="4" fill="#FF0000" />
    </svg>
  );
}

export function LogoWithTagline1({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex items-center justify-center w-10 h-10">
        <AngloStrataIconSvg />
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-bold leading-tight tracking-tight">Anglo Strata</span>
        <span className="text-[10px] uppercase tracking-widest opacity-70 leading-tight">Layers of Data</span>
      </div>
    </div>
  );
}

export function LogoWithTagline2({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex items-center justify-center w-10 h-10">
        <AngloStrataIconSvg />
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-bold leading-tight tracking-tight">Anglo Strata</span>
        <span className="text-[10px] uppercase tracking-widest opacity-70 leading-tight">Insights Unearthed</span>
      </div>
    </div>
  );
}

export function LogoWithTagline3({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex items-center justify-center w-10 h-10">
        <AngloStrataIconSvg />
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-bold leading-tight tracking-tight">Anglo Strata</span>
        <span className="text-[10px] uppercase tracking-widest opacity-70 leading-tight">Data Runs Deep</span>
      </div>
    </div>
  );
}

export function LogoWithTagline4({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex items-center justify-center w-10 h-10">
        <AngloStrataIconSvg />
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-bold leading-tight tracking-tight">Anglo Strata</span>
        <span className="text-[10px] uppercase tracking-widest opacity-70 leading-tight">Mining Intelligence</span>
      </div>
    </div>
  );
}

export function LogoWithTagline5({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex items-center justify-center w-10 h-10">
        <AngloStrataIconSvg />
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-bold leading-tight tracking-tight">Anglo Strata</span>
        <span className="text-[10px] uppercase tracking-widest opacity-70 leading-tight">Deeper Understanding</span>
      </div>
    </div>
  );
}

export function AngloStrataLogo({ className = "" }: { className?: string }) {
  return <LogoWithTagline1 className={className} />;
}

export function AngloStrataIcon({ className = "h-8 w-8" }: { className?: string }) {
  return <AngloStrataIconSvg className={className} />;
}

export function DatabricksLogo({ className = "h-6 w-6" }: { className?: string }) {
  return <AngloStrataIcon className={className} />;
}

export function DatabricksWordmark({ className = "" }: { className?: string }) {
  return <AngloStrataLogo className={className} />;
}
