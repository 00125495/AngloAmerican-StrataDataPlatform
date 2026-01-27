import { Layers } from "lucide-react";

export function AngloStrataLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10">
        <Layers className="h-5 w-5" />
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-bold leading-tight tracking-tight">Anglo Strata</span>
        <span className="text-[10px] uppercase tracking-widest opacity-70 leading-tight">Layers of Data</span>
      </div>
    </div>
  );
}

export function DatabricksLogo({ className = "h-6 w-6" }: { className?: string }) {
  return <Layers className={className} />;
}

export function DatabricksWordmark({ className = "" }: { className?: string }) {
  return <AngloStrataLogo className={className} />;
}
