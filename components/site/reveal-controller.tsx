"use client";

/**
 * Compatibility boundary for layouts that still render the controller.
 * Content is intentionally painted immediately: viewport-driven reveals made
 * long articles appear to skip or delay blocks while scrolling.
 */
export function RevealController({ routeKey, disabled = false }: { routeKey: string; disabled?: boolean }) {
  void routeKey;
  void disabled;
  return null;
}
