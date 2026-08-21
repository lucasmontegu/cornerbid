declare global {
  interface Window {
    datafast?: ((goal: string, params?: Record<string, string>) => void) & {
      q?: unknown[];
    };
  }
}

/** Client-side DataFast goal. Names: lowercase, digits, _, -, :. No PII. */
export function trackGoal(name: string, params?: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  window.datafast?.(name, params);
}
