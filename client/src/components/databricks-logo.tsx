export function AngloAmericanLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none">
      <path
        d="M50 5C25 5 8 30 8 55C8 80 25 95 50 95C75 95 92 80 92 55C92 30 75 5 50 5Z"
        stroke="#031795"
        strokeWidth="6"
        fill="none"
      />
      <path
        d="M50 25L75 70H25L50 25Z"
        fill="#FF0000"
      />
      <circle cx="50" cy="55" r="8" fill="white" />
    </svg>
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
