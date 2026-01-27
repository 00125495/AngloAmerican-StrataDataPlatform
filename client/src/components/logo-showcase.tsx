import { LogoOption1, LogoOption2, LogoOption3, LogoOption4, LogoOption5 } from "./databricks-logo";

export function LogoShowcase() {
  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-8">
      <div className="bg-card rounded-xl border p-8 max-w-4xl w-full shadow-xl">
        <h2 className="text-2xl font-bold mb-2 text-center">Choose Your Logo</h2>
        <p className="text-muted-foreground text-center mb-8">Pick the logo style you prefer</p>
        
        <div className="grid gap-6">
          <div className="flex items-center gap-8 p-6 rounded-lg border bg-sidebar text-sidebar-foreground">
            <span className="text-lg font-bold w-24">Option 1</span>
            <LogoOption1 />
            <span className="text-sm opacity-70 ml-auto">Horizontal layers with vertical red stripe</span>
          </div>
          
          <div className="flex items-center gap-8 p-6 rounded-lg border bg-sidebar text-sidebar-foreground">
            <span className="text-lg font-bold w-24">Option 2</span>
            <LogoOption2 />
            <span className="text-sm opacity-70 ml-auto">Nested hexagons with red center dot</span>
          </div>
          
          <div className="flex items-center gap-8 p-6 rounded-lg border bg-sidebar text-sidebar-foreground">
            <span className="text-lg font-bold w-24">Option 3</span>
            <LogoOption3 />
            <span className="text-sm opacity-70 ml-auto">Stacked ellipses (3D data layers)</span>
          </div>
          
          <div className="flex items-center gap-8 p-6 rounded-lg border bg-sidebar text-sidebar-foreground">
            <span className="text-lg font-bold w-24">Option 4</span>
            <LogoOption4 />
            <span className="text-sm opacity-70 ml-auto">Stacked lines with red notification dot</span>
          </div>
          
          <div className="flex items-center gap-8 p-6 rounded-lg border bg-sidebar text-sidebar-foreground">
            <span className="text-lg font-bold w-24">Option 5</span>
            <LogoOption5 />
            <span className="text-sm opacity-70 ml-auto">Mountain/pyramid layers with red peak</span>
          </div>
        </div>
        
        <p className="text-center text-muted-foreground mt-6 text-sm">
          Tell me which option number you prefer (1-5)
        </p>
      </div>
    </div>
  );
}
