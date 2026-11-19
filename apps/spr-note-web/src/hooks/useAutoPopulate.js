/**
 * useAutoPopulate.js
 * Universal React Hook for orchestrating Auto-Populate engine workflows across modules.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import autoPopulateEngine from '../utils/auto-populate';
import { useToast } from '../context/ToastContext';

export default function useAutoPopulate(domainKey, context = {}) {
  const { showToast } = useToast();
  const [isSimulating, setIsSimulating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);

  const generator = useMemo(() => {
    return autoPopulateEngine.getGenerator(domainKey);
  }, [domainKey]);

  const schema = useMemo(() => {
    if (!generator) return null;
    return generator.getSchema(context);
  }, [generator, context]);

  // Run dry-run simulation
  const runSimulation = useCallback(
    async (options = {}) => {
      if (!generator) {
        setErrors([`Generator '${domainKey}' is not registered.`]);
        return null;
      }

      setIsSimulating(true);
      setErrors([]);
      setWarnings([]);

      try {
        const result = await autoPopulateEngine.simulate(domainKey, context, options);
        if (!result.isValid) {
          setErrors(result.errors || ['Validation failed.']);
          setWarnings(result.warnings || []);
          setSimulationResult(null);
          return null;
        }

        setSimulationResult(result.simulation);
        setWarnings(result.warnings || []);
        return result.simulation;
      } catch (err) {
        setErrors([err.message || 'Simulation encountered an error.']);
        setSimulationResult(null);
        return null;
      } finally {
        setIsSimulating(false);
      }
    },
    [generator, domainKey, context]
  );

  // Execute and commit to store
  const execute = useCallback(
    async (options = {}, passedSimulation = null) => {
      if (!generator) {
        showToast(`Generator '${domainKey}' is not registered.`, 'error');
        return { success: false };
      }

      setIsExecuting(true);
      try {
        const res = await autoPopulateEngine.execute(
          domainKey,
          context,
          options,
          passedSimulation || simulationResult
        );

        if (res.success) {
          showToast(res.message || 'Auto-populate completed successfully.', 'success');
        } else {
          showToast(res.message || 'Auto-populate failed.', 'error');
        }

        return res;
      } catch (err) {
        showToast(err.message || 'Execution error.', 'error');
        return { success: false, error: err.message };
      } finally {
        setIsExecuting(false);
      }
    },
    [generator, domainKey, context, simulationResult, showToast]
  );

  const resetSimulation = useCallback(() => {
    setSimulationResult(null);
    setErrors([]);
    setWarnings([]);
  }, []);

  return {
    generator,
    schema,
    isSimulating,
    isExecuting,
    simulationResult,
    errors,
    warnings,
    runSimulation,
    execute,
    resetSimulation,
  };
}
