/**
 * Classe de base pour tous les adapters de données
 * Fournit les méthodes communes et la structure de base
 */
export class BaseAdapter {
  constructor(source) {
    this.source = source;
  }

  /**
   * Méthode abstraite à implémenter par chaque adapter
   * @param {any} data - Données brutes à normaliser
   * @returns {Object} Données normalisées
   */
  normalize(data) {
    throw new Error(`normalize() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Applique les valeurs par défaut aux données
   * @param {Object} data - Données normalisées
   * @param {Object} defaults - Valeurs par défaut
   * @returns {Object} Données avec valeurs par défaut
   */
  withDefaults(data, defaults) {
    return { ...defaults, ...data };
  }

  /**
   * Valide les données normalisées
   * @param {Object} data - Données à valider
   * @returns {Object} Données validées
   */
  validate(data) {
    // Implémentation basique, peut être étendue
    if (!data) {
      throw new Error('Data is required for validation');
    }
    return data;
  }

  /**
   * Nettoie les valeurs nulles ou undefined et tente de convertir les chaînes en nombres
   * @param {any} value - Valeur à nettoyer
   * @param {any} defaultValue - Valeur par défaut
   * @returns {any} Valeur nettoyée
   */
  cleanValue(value, defaultValue = null) {
    // Valeur null, undefined ou NaN
    if (value === undefined || value === null || (typeof value === 'number' && isNaN(value))) {
      return defaultValue;
    }

    // Nettoyage des chaînes de caractères
    if (typeof value === 'string') {
      // Chaîne vide ou valeurs spéciales
      if (value.trim() === '' ||
        value.toLowerCase() === 'nan' ||
        value.toLowerCase() === 'n/a' ||
        value.toLowerCase() === 'null' ||
        value.toLowerCase() === 'undefined') {
        return defaultValue;
      }

      // Tenter de convertir en nombre si possible
      if (/^-?\d*\.?\d+$/.test(value.trim())) {
        const parsed = parseFloat(value);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
    }

    // Pour les objets qui ont une méthode valueOf (comme Date)
    if (typeof value === 'object' && value !== null && typeof value.valueOf === 'function') {
      const primitive = value.valueOf();
      if (typeof primitive === 'number' && !isNaN(primitive)) {
        return primitive;
      }
    }

    return value;
  }

  /**
   * Convertit un timestamp en ISO string
   * @param {any} timestamp - Timestamp à convertir
   * @returns {string} Date en format ISO
   */
  normalizeTimestamp(timestamp) {
    if (!timestamp) return new Date().toISOString();

    // Si c'est déjà une string ISO, la retourner
    if (typeof timestamp === 'string' && timestamp.includes('T')) {
      return timestamp;
    }

    // Si c'est un timestamp Unix (secondes)
    if (typeof timestamp === 'number' && timestamp < 10000000000) {
      return new Date(timestamp * 1000).toISOString();
    }

    // Si c'est un timestamp en millisecondes
    if (typeof timestamp === 'number') {
      return new Date(timestamp).toISOString();
    }

    // Essayer de parser comme date
    try {
      return new Date(timestamp).toISOString();
    } catch {
      return new Date().toISOString();
    }
  }
}
