export interface StoredUserKey {
  id: string;
  key: string;
  name: string;
  enabled: boolean;
  createdAt: number;
  lastStatus?: "ok" | "sem_creditos" | "limite_temporario" | "invalida" | "desconhecido";
  lastMessage?: string;
  lastCheckedAt?: number;
}

export interface UserKeysStorage {
  selectedKeyId: "auto" | string; // "auto" ou o id da chave (ou "server_main")
  keys: StoredUserKey[];
}

const STORAGE_KEY = "af_custom_api_keys_v2";
const LEGACY_STORAGE_KEY = "af_custom_api_keys";

export function maskKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length <= 12) return trimmed;
  return `${trimmed.slice(0, 8)}...${trimmed.slice(-6)}`;
}

export function getStoredUserKeysConfig(): UserKeysStorage {
  if (typeof window === "undefined") {
    return { selectedKeyId: "auto", keys: [] };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.keys)) {
        return {
          selectedKeyId: parsed.selectedKeyId || "auto",
          keys: parsed.keys,
        };
      }
    }

    // Migração de dados legados se houver (array simples de strings)
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const legacyParsed = JSON.parse(legacyRaw);
      if (Array.isArray(legacyParsed)) {
        const migrated: StoredUserKey[] = legacyParsed
          .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
          .map((k, index) => ({
            id: `key_${Date.now()}_${index}`,
            key: k.trim(),
            name: `Chave ${index + 1} (${maskKey(k)})`,
            enabled: true,
            createdAt: Date.now(),
            lastStatus: "desconhecido",
          }));

        const initialConfig: UserKeysStorage = { selectedKeyId: "auto", keys: migrated };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialConfig));
        return initialConfig;
      }
    }
  } catch (e) {
    console.error("Erro ao ler chaves salvas:", e);
  }

  return { selectedKeyId: "auto", keys: [] };
}

export function saveStoredUserKeysConfig(config: UserKeysStorage): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent("af:keys-updated"));
  } catch (e) {
    console.error("Erro ao salvar chaves:", e);
  }
}

/**
 * Retorna o array de chaves ativas a serem enviadas nas requisições de IA.
 * Se o usuário escolheu uma chave específica manualmente, retorna apenas essa chave (com prioridade máxima).
 * Se estiver em modo "auto", retorna todas as chaves habilitadas pelo usuário em ordem.
 */
export function getUserApiKeys(): string[] {
  const config = getStoredUserKeysConfig();
  if (config.selectedKeyId !== "auto" && config.selectedKeyId !== "server_main") {
    const selected = config.keys.find((k) => k.id === config.selectedKeyId);
    if (selected && selected.key) {
      return [selected.key];
    }
  }

  // Modo auto: todas as chaves habilitadas
  return config.keys.filter((k) => k.enabled !== false).map((k) => k.key);
}

export function addUserApiKey(key: string, name?: string): { ok: boolean; message?: string; keyItem?: StoredUserKey } {
  const trimmedKey = key.trim();
  if (!trimmedKey) return { ok: false, message: "Chave de API não informada." };

  const config = getStoredUserKeysConfig();
  if (config.keys.some((k) => k.key === trimmedKey)) {
    return { ok: false, message: "Esta chave de API já está cadastrada no sistema." };
  }

  const defaultName = name?.trim() || `Chave ${config.keys.length + 1} (${maskKey(trimmedKey)})`;
  const newItem: StoredUserKey = {
    id: `key_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    key: trimmedKey,
    name: defaultName,
    enabled: true,
    createdAt: Date.now(),
    lastStatus: "ok",
    lastCheckedAt: Date.now(),
  };

  config.keys.unshift(newItem);
  saveStoredUserKeysConfig(config);
  return { ok: true, keyItem: newItem };
}

export function renameUserApiKey(id: string, newName: string): boolean {
  const trimmedName = newName.trim();
  if (!trimmedName) return false;
  const config = getStoredUserKeysConfig();
  const item = config.keys.find((k) => k.id === id);
  if (!item) return false;

  item.name = trimmedName;
  saveStoredUserKeysConfig(config);
  return true;
}

export function removeUserApiKey(id: string): void {
  const config = getStoredUserKeysConfig();
  config.keys = config.keys.filter((k) => k.id !== id);
  if (config.selectedKeyId === id) {
    config.selectedKeyId = "auto";
  }
  saveStoredUserKeysConfig(config);
}

export function toggleUserApiKey(id: string, enabled: boolean): void {
  const config = getStoredUserKeysConfig();
  const item = config.keys.find((k) => k.id === id);
  if (!item) return;

  item.enabled = enabled;
  saveStoredUserKeysConfig(config);
}

export function setSelectedKeyMode(selectedKeyId: "auto" | string): void {
  const config = getStoredUserKeysConfig();
  config.selectedKeyId = selectedKeyId;
  saveStoredUserKeysConfig(config);
}

export function updateKeyStatus(
  id: string,
  status: StoredUserKey["lastStatus"],
  message?: string,
): void {
  const config = getStoredUserKeysConfig();
  const item = config.keys.find((k) => k.id === id);
  if (!item) return;

  item.lastStatus = status;
  item.lastMessage = message;
  item.lastCheckedAt = Date.now();
  saveStoredUserKeysConfig(config);
}

