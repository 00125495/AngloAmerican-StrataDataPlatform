export function AngloAmericanTextLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold tracking-tight" style={{ color: '#031795' }}>Anglo</span>
        <span className="text-xl font-bold tracking-tight" style={{ color: '#FF0000' }}>American</span>
      </div>
      <span className="text-[10px] uppercase tracking-[0.2em] opacity-80 leading-tight mt-0.5">Strata</span>
    </div>
  );
}

export function AngloStrataLogoFull({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#031795' }}>
        <span className="text-white font-bold text-lg">A</span>
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-bold leading-tight tracking-tight">Anglo Strata</span>
        <span className="text-[10px] uppercase tracking-widest opacity-70 leading-tight">Layers of Data</span>
      </div>
    </div>
  );
}

export function AngloStrataLogoMinimal({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex flex-col">
        <div className="flex items-baseline">
          <span className="text-xl font-bold leading-tight tracking-tight">Anglo</span>
          <span className="text-xl font-bold leading-tight tracking-tight text-[#FF0000]">Strata</span>
        </div>
        <span className="text-[10px] uppercase tracking-widest opacity-70 leading-tight">Layers of Data</span>
      </div>
    </div>
  );
}

export function LogoWithTagline1({ className = "" }: { className?: string }) {
  return <AngloStrataLogoFull className={className} />;
}

export function LogoWithTagline2({ className = "" }: { className?: string }) {
  return <AngloStrataLogoMinimal className={className} />;
}

export function LogoWithTagline3({ className = "" }: { className?: string }) {
  return <AngloAmericanTextLogo className={className} />;
}

export function AngloStrataIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <div className={`rounded-lg flex items-center justify-center ${className}`} style={{ backgroundColor: '#031795' }}>
      <span className="text-white font-bold text-sm">A</span>
    </div>
  );
}

export function AngloStrataLogo({ className = "" }: { className?: string }) {
  return <AngloStrataLogoFull className={className} />;
}

export function DatabricksLogo({ className = "h-6 w-6" }: { className?: string }) {
  return <AngloStrataIcon className={className} />;
}

export function DatabricksWordmark({ className = "" }: { className?: string }) {
  return <AngloStrataLogo className={className} />;
}
