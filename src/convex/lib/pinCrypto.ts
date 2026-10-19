import { Scrypt } from "lucia";

const scrypt = new Scrypt();

/**
 * A real hash of a throwaway value. Verifying against it when an email is
 * unknown keeps the PIN check's cost similar whether or not an account exists,
 * so timing alone cannot be used to enumerate hosts.
 */
const TIMING_EQUALIZER_HASH =
  "38676e507ea21e57ea8f2a52a9b82cb4:bbcaeaf60e0b837c85e5844fcbfae9bb939b8cd438cf2bbecd9d7eeb34df4bcd1461aa51dfa2836be134a3432650670100b9c12677f060720a4b53869caae326";

/** Salted Scrypt hash. The PIN itself is never stored or logged. */
export async function hashPin(pin: string): Promise<string> {
  return await scrypt.hash(pin.normalize("NFKC"));
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return await scrypt.verify(hash, pin.normalize("NFKC"));
}

/** Spend the same work as a real check without revealing account existence. */
export async function burnPinCheck(pin: string): Promise<void> {
  if (!/^\d{6}$/.test(pin)) return;
  await scrypt.verify(TIMING_EQUALIZER_HASH, pin.normalize("NFKC"));
}
