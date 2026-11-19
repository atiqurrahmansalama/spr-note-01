/**
 * AutoPopulateEngine.js
 * Central Orchestrator & Plugin Registry for the Universal Auto-Populate Framework.
 * Manages domain-specific generator plugins, executes validation & dry-run simulations,
 * and coordinates atomic store commits with real-time application broadcasts.
 */

class AutoPopulateEngine {
  constructor() {
    /** @type {Map<string, import('./BaseGenerator').default>} */
    this.generators = new Map();
    this.executionHistory = [];
  }

  /**
   * Registers a domain-specific generator plugin into the engine.
   * @param {import('./BaseGenerator').default} generator
   */
  register(generator) {
    if (!generator || !generator.domainKey) {
      throw new Error('AutoPopulateEngine: Invalid generator registration.');
    }
    this.generators.set(generator.domainKey, generator);
  }

  /**
   * Unregisters a generator by domain key.
   * @param {string} domainKey
   */
  unregister(domainKey) {
    this.generators.delete(domainKey);
  }

  /**
   * Gets a registered generator by domain key.
   * @param {string} domainKey
   * @returns {import('./BaseGenerator').default|null}
   */
  getGenerator(domainKey) {
    return this.generators.get(domainKey) || null;
  }

  /**
   * Lists all registered generators and their descriptors.
   * @returns {Array<Object>}
   */
  listGenerators() {
    return Array.from(this.generators.values()).map((g) => ({
      domainKey: g.domainKey,
      title: g.title,
      description: g.description,
      category: g.category,
      icon: g.icon,
    }));
  }

  /**
   * Validates execution prerequisites for a domain.
   * @param {string} domainKey
   * @param {Object} context
   * @param {Object} options
   * @returns {{ isValid: boolean, errors: string[], warnings: string[] }}
   */
  validate(domainKey, context = {}, options = {}) {
    const generator = this.getGenerator(domainKey);
    if (!generator) {
      return {
        isValid: false,
        errors: [`Generator for domain '${domainKey}' is not registered.`],
        warnings: [],
      };
    }
    return generator.validate(context, options);
  }

  /**
   * Runs a dry-run preview simulation for a domain without altering stores.
   * 
   * @param {string} domainKey
   * @param {Object} context
   * @param {Object} options
   * @returns {Promise<{
   *   isValid: boolean,
   *   errors: string[],
   *   warnings: string[],
   *   simulation: Object|null
   * }>}
   */
  async simulate(domainKey, context = {}, options = {}) {
    const validation = this.validate(domainKey, context, options);
    if (!validation.isValid) {
      return {
        ...validation,
        simulation: null,
      };
    }

    const generator = this.getGenerator(domainKey);
    try {
      const simulation = await generator.simulate(context, options);
      return {
        isValid: true,
        errors: [],
        warnings: validation.warnings || [],
        simulation,
      };
    } catch (err) {
      return {
        isValid: false,
        errors: [err.message || 'Error occurred during simulation.'],
        warnings: validation.warnings || [],
        simulation: null,
      };
    }
  }

  /**
   * Executes the auto-populate routine and commits the result to the store.
   * 
   * @param {string} domainKey
   * @param {Object} context
   * @param {Object} options
   * @param {Object} [simulationResult]
   * @returns {Promise<{
   *   success: boolean,
   *   message: string,
   *   data: any,
   *   error?: string
   * }>}
   */
  async execute(domainKey, context = {}, options = {}, simulationResult = null) {
    const generator = this.getGenerator(domainKey);
    if (!generator) {
      throw new Error(`Generator for domain '${domainKey}' is not registered.`);
    }

    const validation = generator.validate(context, options);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    try {
      const result = await generator.execute(context, options, simulationResult);

      // Track execution in session audit history
      this.executionHistory.push({
        id: `exec_${Date.now()}`,
        domainKey,
        timestamp: new Date().toISOString(),
        options,
        summary: result?.summary || {},
      });

      // Broadcast universal completion event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('spr_auto_populate_completed', {
            detail: {
              domainKey,
              summary: result?.summary,
              timestamp: Date.now(),
            },
          })
        );
      }

      return {
        success: true,
        message: result?.message || `Successfully auto-populated ${generator.title}.`,
        data: result?.data || result,
        summary: result?.summary,
      };
    } catch (err) {
      return {
        success: false,
        message: err.message || 'Execution failed.',
        error: err.message,
      };
    }
  }
}

// Export singleton engine instance
export const autoPopulateEngine = new AutoPopulateEngine();
export default autoPopulateEngine;
