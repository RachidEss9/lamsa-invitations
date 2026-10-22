/** A reactive-enough stand-in for convex/react, used only by the test harness. */
import { CONTENT } from "./content";

export const TEST_ID = "j57abcdefghijklmnopqrstuvwx";

const invitation = {
  _id: TEST_ID,
  _creationTime: 1,
  ...CONTENT,
  design: null,
  designImageUrls: {},
  status: "draft",
  slug: "alexandra-omar",
  ownerId: "user_test",
};

(globalThis as { __savedDesign?: unknown }).__savedDesign = null;
(globalThis as { __mutations?: string[] }).__mutations = [];

export function useQuery(reference: { __name?: string } | undefined, _args?: unknown) {
  if (!reference) return undefined;
  if (reference.__name === "getMine") return invitation;
  if (reference.__name === "listMine") return [];
  return undefined;
}

const cache = new Map<string, (...args: unknown[]) => Promise<unknown>>();

export function useMutation(reference: { __name?: string } | undefined) {
  const name = reference?.__name ?? "unknown";
  let fn = cache.get(name);
  if (!fn) {
    fn = async (args: unknown) => {
      (globalThis as { __mutations?: string[] }).__mutations?.push(name);
      if (name === "saveDesign") {
        (globalThis as { __savedDesign?: unknown }).__savedDesign =
          (args as { design?: unknown })?.design ?? null;
        return null;
      }
      if (name === "generateUploadUrl") return "https://example.test/upload";
      return null;
    };
    cache.set(name, fn);
  }
  return fn;
}

export function useConvexAuth() {
  return { isLoading: false, isAuthenticated: true };
}

export function useConvex() {
  return {};
}

export class ConvexReactClient {
  constructor(_url?: string) {}
}
