// Map<jti, expiresAtMs> — tokens revogados antes de expirar naturalmente
const _blacklist = new Map();

/**
 * Adiciona um jti à blacklist até ele expirar.
 * @param {string} jti  - identificador único do token
 * @param {number} expiresAt - Unix timestamp em MILISSEGUNDOS (payload.exp * 1000)
 */
export function addToBlacklist(jti, expiresAt) {
    if (jti) _blacklist.set(jti, expiresAt);
}

/**
 * Retorna true se o jti estiver na blacklist e ainda não tiver expirado.
 * @param {string} jti
 */
export function isBlacklisted(jti) {
    if (!jti) return false;
    const exp = _blacklist.get(jti);
    if (exp === undefined) return false;
    if (Date.now() > exp) {
        _blacklist.delete(jti); // limpeza antecipada
        return false;
    }
    return true;
}

// Limpeza periódica de entradas expiradas — evita vazamento de memória
setInterval(() => {
    const now = Date.now();
    for (const [jti, exp] of _blacklist) {
        if (now > exp) _blacklist.delete(jti);
    }
}, 60 * 60 * 1000 /* 1h */).unref(); // .unref() não impede o processo de encerrar
