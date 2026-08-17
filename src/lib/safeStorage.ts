// Safe localStorage manager with auto-cleanup on QuotaExceededError
export function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    console.warn(`Quota ou aviso no localStorage ao salvar "${key}":`, err);
    try {
      // Clean up legacy, temporary, or non-essential cache
      const keysToClean = [
        'logs_auditoria_',
        'estoque_sync_cache',
        'temp_',
        'migracao_auto_banco_antigo_concluida_v1',
      ];

      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && keysToClean.some((prefix) => k.startsWith(prefix))) {
          localStorage.removeItem(k);
        }
      }

      // Retry setting item
      localStorage.setItem(key, value);
      return true;
    } catch (retryErr) {
      console.warn(`Limite de armazenamento local (localStorage) atingido para "${key}". Os dados continuam seguros e sincronizados no Firestore na nuvem.`);
      return false;
    }
  }
}

export function safeLocalStorageGet(key: string, fallback: string | null = null): string | null {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch (err) {
    console.warn(`Erro ao ler localStorage para chave "${key}":`, err);
    return fallback;
  }
}
