import { MODULE_REGISTRY, runModuleAnalysis } from '../index.mjs';
export const MODULE_DEFINITION = MODULE_REGISTRY.find((x) => x.id === 'flood');
export function executeEngine({ job_id, aoi, period, options = {}, inventory }) {
  return runModuleAnalysis({ job_id, aoi, module: 'flood', period, options, inventory });
}