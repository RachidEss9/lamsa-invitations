import { createContext, useContext } from "react";

export interface StudioSessionValue {
  /** The verified owner's email, when the studio is open. */
  email: string | null;
  /** Locks the studio in this tab; the PIN is required again to reopen it. */
  lock: () => void;
}

export const StudioSessionContext =
  createContext<StudioSessionValue | null>(null);

/** Available inside routes wrapped by StudioGate. */
export function useStudio(): StudioSessionValue {
  const value = useContext(StudioSessionContext);
  if (!value) {
    throw new Error("useStudio must be used inside StudioGate");
  }
  return value;
}
