/**
 * src/validation.js
 * Helpers de validação de entrada reutilizáveis nos route handlers.
 */

/**
 * Verifica que todos os campos obrigatórios estão presentes e não vazios.
 * @param {object} body
 * @param {string[]} fields
 * @returns {{ ok: false, message: string } | { ok: true }}
 */
export function requireFields(body, fields) {
    for (const field of fields) {
        const val = body?.[field];
        if (val === undefined || val === null || String(val).trim() === '') {
            return { ok: false, message: `Campo obrigatório ausente: ${field}` };
        }
    }
    return { ok: true };
}

/**
 * Faz parse de um valor numérico positivo (aceita vírgula como separador decimal).
 * @param {string | number} value
 * @returns {number | null} null se inválido
 */
export function parsePositiveFloat(value) {
    const n = parseFloat(String(value).replace(',', '.'));
    return isNaN(n) || n <= 0 ? null : n;
}

/**
 * Valida formato de data YYYY-MM-DD.
 * @param {string} dateStr
 * @returns {boolean}
 */
export function validateDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return false;
    return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(Date.parse(dateStr));
}
