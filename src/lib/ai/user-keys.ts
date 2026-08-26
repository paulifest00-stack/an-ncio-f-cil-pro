const STORAGE_KEY = "af_custom_api_keys";

export function getUserApiKeys(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string" && k.trim().length > 0) : [];
  } catch {
    return [];
  }
}

export function addUserApiKey(key: string): boolean {
  if (typeof window === "undefined") return false;
  const trimmed = key.trim();
  if (!trimmed) return false;

  const current = getUserApiKeys();
  if (current.includes(trimmed)) return false;

  const updated = [trimmed, ...current];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("af:keys-updated"));
    return true;
  } catch {
    return false;
  }
}

export function removeUserApiKey(key: string): void {
  if (typeof window === "undefined") return;
  const current = getUserApiKeys();
  const updated = current.filter((k) => k !== key.trim());
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("af:keys-updated"));
  } catch {
    // ignore
  }
}

export function maskKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length <= 12) return trimmed;
  return `${trimmed.slice(0, 8)}...${trimmed.slice(-6)}`;
}
