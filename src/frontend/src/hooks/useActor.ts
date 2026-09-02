import { mockBackend } from "@/mocks/backend";
// Compatibility shim: wraps the new useActor from core-infrastructure with createActor from backend.
// Returns the stable mockBackend singleton under VITE_USE_MOCK so every data hook shares one mock actor.
import { useActor as useCoreActor } from "@caffeineai/core-infrastructure";
import { createActor } from "../backend";
import type { backendInterface } from "../backend";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

export function useActor(): {
  actor: backendInterface | null;
  isFetching: boolean;
} {
  const real = useCoreActor(createActor as Parameters<typeof useCoreActor>[0]);
  if (USE_MOCK) {
    return { actor: mockBackend, isFetching: false };
  }
  return {
    actor: real.actor as backendInterface | null,
    isFetching: real.isFetching,
  };
}
