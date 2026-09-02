// Pure helpers — module-level so they never appear in useCallback dep arrays

export function nowTimestamp(): string {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export function getCameraFollowSpeed(
  screenWidth: number,
  isMobile: boolean,
): number {
  if (isMobile) {
    return 0.35; // Much snappier on mobile — tight follow
  }
  if (screenWidth < 1200) {
    return 0.12; // Slightly slower for medium screens
  }
  return 0.08; // Much slower for large screens
}

export function getSessionVersion(): number {
  try {
    return Number.parseInt(
      localStorage.getItem("pbv_session_version") ?? "0",
      10,
    );
  } catch {
    return 0;
  }
}
