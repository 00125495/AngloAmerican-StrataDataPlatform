import angloLogo from "@assets/Screenshot_2026-01-27_at_07.04.45_1769497521466.png";

export function AngloAmericanLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <img 
      src={angloLogo} 
      alt="Anglo American" 
      className={className}
    />
  );
}

export function AngloStrataLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <AngloAmericanLogo className="w-10 h-10" />
      <div className="flex flex-col">
        <span className="text-lg font-bold leading-tight tracking-tight">Anglo Strata</span>
        <span className="text-[10px] uppercase tracking-widest opacity-70 leading-tight">Mining Intelligence</span>
      </div>
    </div>
  );
}

export function AngloStrataIcon({ className = "h-8 w-8" }: { className?: string }) {
  return <AngloAmericanLogo className={className} />;
}

export function DatabricksLogo({ className = "h-6 w-6" }: { className?: string }) {
  return <AngloStrataIcon className={className} />;
}

export function DatabricksWordmark({ className = "" }: { className?: string }) {
  return <AngloStrataLogo className={className} />;
}
