import { createContext, useContext } from "react";

export interface StudioSessionValue {
  email: string | null;
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
