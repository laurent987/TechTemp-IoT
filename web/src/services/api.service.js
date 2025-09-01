/**
 * Service pour gérer les requêtes API avec mécanisme de retry et gestion d'erreurs
 */

/**
 * Fonction qui attend un délai spécifié
 * @param {number} ms - Délai en millisecondes
 * @returns {Promise} Promise qui se résout après le délai
 */
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Effectue une requête fetch avec retry automatique
 * @param {string} url - URL complète de la requête
 * @param {Object} options - Options fetch standard
 * @param {Object} retryOptions - Options pour le retry
 * @returns {Promise<Response>} Réponse de la requête
 */
export async function fetchWithRetry(url, options = {}, retryOptions = {}) {
  const {
    retryAttempts = 2,
    retryDelay = 1000,
    timeout = 5000,
    onRetry = null
  } = retryOptions;

  // Créer un signal d'abandon avec timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Ajouter le signal aux options
  const fetchOptions = {
    ...options,
    signal: controller.signal
  };

  let lastError;
  let attempt = 0;

  while (attempt <= retryAttempts) {
    try {
      attempt++;
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      // Si la réponse n'est pas OK et ce n'est pas la dernière tentative
      if (!response.ok && attempt <= retryAttempts) {
        const error = new Error(`HTTP error: ${response.status}`);
        error.response = response;
        throw error;
      }

      return response;
    } catch (error) {
      lastError = error;

      // Si c'est une erreur d'abandon, ne pas réessayer
      if (error.name === 'AbortError') {
        console.warn(`Request to ${url} timed out after ${timeout}ms`);
        clearTimeout(timeoutId);
        throw new Error(`Request timeout after ${timeout}ms`);
      }

      // Si ce n'est pas la dernière tentative, attendre et réessayer
      if (attempt <= retryAttempts) {
        console.warn(`Attempt ${attempt}/${retryAttempts} failed for ${url}. Retrying in ${retryDelay}ms...`);

        // Exécuter le callback de retry si fourni
        if (typeof onRetry === 'function') {
          onRetry(error, attempt);
        }

        await delay(retryDelay);
      } else {
        console.error(`All ${retryAttempts} retry attempts failed for ${url}`, error);
        throw lastError;
      }
    }
  }

  throw lastError;
}

/**
 * Vérifie si une URL est accessible
 * @param {string} url - URL à vérifier
 * @param {number} timeout - Timeout en ms
 * @returns {Promise<boolean>} True si l'URL est accessible
 */
export async function isUrlAccessible(url, timeout = 2000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.warn(`URL ${url} is not accessible:`, error.message);
    return false;
  }
}

/**
 * Effectue une requête GET
 * @param {string} url - URL de la requête
 * @param {Object} options - Options supplémentaires
 * @returns {Promise<any>} Données JSON de la réponse
 */
export async function apiGet(url, options = {}) {
  const response = await fetchWithRetry(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  }, options.retry);

  return response.json();
}

/**
 * Effectue une requête POST
 * @param {string} url - URL de la requête
 * @param {Object} data - Données à envoyer
 * @param {Object} options - Options supplémentaires
 * @returns {Promise<any>} Données JSON de la réponse
 */
export async function apiPost(url, data, options = {}) {
  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: JSON.stringify(data),
    ...options
  }, options.retry);

  return response.json();
}

export default {
  fetchWithRetry,
  isUrlAccessible,
  apiGet,
  apiPost
};
