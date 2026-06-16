import { useCallback, useState } from "react";

export function usePulse() {
  const [pulseKey, setPulseKey] = useState(0);
  const pulse = useCallback(() => setPulseKey((value) => value + 1), []);
  return { pulseKey, pulse };
}
