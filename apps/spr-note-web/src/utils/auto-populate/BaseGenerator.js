/**
 * BaseGenerator
 * Enterprise Abstract Generator Contract for the Universal Auto-Populate Framework.
 * All domain-specific generators (Exam Routine, Invigilation, Timetable, Marksheets, etc.)
 * extend this base class to ensure consistent validation, simulation, and execution.
 */
export default class BaseGenerator {
  constructor({
    domainKey,
    title,
    description,
    category = 'General',
    icon = null,
    targetStore = null,
    defaultStrategies = {},
  }) {
    if (!domainKey) {
      throw new Error('BaseGenerator: domainKey is required.');
    }
    this.domainKey = domainKey;
    this.title = title || domainKey;
    this.description = description || '';
    this.category = category;
    this.icon = icon;
    this.targetStore = targetStore;
    this.defaultStrategies = defaultStrategies;
  }

  /**
   * Returns schema configuration for UI drawer rendering
   * (e.g. strategy options, selector fields, toggle switches)
   * @param {Object} context - Execution context (activeExam, tenantId, classes, etc.)
   * @returns {Object} Schema descriptor
   */
  getSchema(context = {}) {
    return {
      strategies: [],
      scopeFields: [],
      defaultOptions: { ...this.defaultStrategies },
    };
  }

  /**
   * Validates if the required context and scope inputs are present
   * @param {Object} context - Execution context
   * @param {Object} options - User selected strategy options
   * @returns {{ isValid: boolean, errors: string[], warnings: string[] }}
   */
  validate(context = {}, options = {}) {
    return {
      isValid: true,
      errors: [],
      warnings: [],
    };
  }

  /**
   * Generates a dry-run preview simulation without mutating stores.
   * Calculates diff: toCreate, toUpdate, toSkip, conflicts, warnings, summary statistics.
   * @param {Object} context - Execution context
   * @param {Object} options - User selected strategy options
   * @returns {Promise<Object>|Object} Simulation result
   */
  simulate(context = {}, options = {}) {
    throw new Error(`Generator [${this.domainKey}] must implement simulate(context, options).`);
  }

  /**
   * Executes the actual population and commits changes to the appropriate store.
   * @param {Object} context - Execution context
   * @param {Object} options - User selected strategy options
   * @param {Object} [simulationResult] - Optional pre-calculated simulation result
   * @returns {Promise<Object>|Object} Execution summary and committed items
   */
  execute(context = {}, options = {}, simulationResult = null) {
    throw new Error(`Generator [${this.domainKey}] must implement execute(context, options).`);
  }
}
