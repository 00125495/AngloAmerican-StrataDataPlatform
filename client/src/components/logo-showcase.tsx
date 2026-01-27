import { LogoWithTagline1, LogoWithTagline2, LogoWithTagline3 } from "./databricks-logo";

export function LogoShowcase() {
  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-8">
      <div className="bg-card rounded-xl border p-8 max-w-4xl w-full shadow-xl">
        <h2 className="text-2xl font-bold mb-2 text-center">Choose Your Logo Style</h2>
        <p className="text-muted-foreground text-center mb-8">Anglo American inspired branding options</p>
        
        <div className="grid gap-6">
          <div className="flex items-center gap-8 p-6 rounded-lg border bg-sidebar text-sidebar-foreground">
            <span className="text-lg font-bold w-24">Option 1</span>
            <LogoWithTagline1 />
            <span className="text-sm opacity-70 ml-auto">Blue "A" icon with "Anglo Strata"</span>
          </div>
          
          <div className="flex items-center gap-8 p-6 rounded-lg border bg-sidebar text-sidebar-foreground">
            <span className="text-lg font-bold w-24">Option 2</span>
            <LogoWithTagline2 />
            <span className="text-sm opacity-70 ml-auto">Text only with red "Strata"</span>
          </div>
          
          <div className="flex items-center gap-8 p-6 rounded-lg border bg-sidebar text-sidebar-foreground">
            <span className="text-lg font-bold w-24">Option 3</span>
            <LogoWithTagline3 />
            <span className="text-sm opacity-70 ml-auto">"Anglo American" style with Strata</span>
          </div>
        </div>
        
        <p className="text-center text-muted-foreground mt-6 text-sm">
          Tell me which style you prefer (1, 2, or 3)
        </p>
      </div>
    </div>
  );
}
