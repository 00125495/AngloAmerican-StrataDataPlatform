export function DatabricksLogo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16 0L3 7.5v17L16 32l13-7.5v-17L16 0z"
        fill="currentColor"
        className="text-primary"
      />
      <path
        d="M16 6.5L8 11v9l8 4.5 8-4.5v-9l-8-4.5z"
        fill="white"
        className="dark:fill-background"
      />
      <path
        d="M16 11l-4 2.25v4.5L16 20l4-2.25v-4.5L16 11z"
        fill="currentColor"
        className="text-primary"
      />
    </svg>
  );
}

export function DatabricksWordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <DatabricksLogo className="h-7 w-7" />
      <span className="font-semibold text-lg tracking-tight">
        Databricks <span className="text-primary">AI Chat</span>
      </span>
    </div>
  );
}
