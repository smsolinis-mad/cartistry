export { RulesEngine, generatePlanogram } from './engine';
export type { EngineInput, EngineOutput } from './engine';
export { RULES, getRulesByObjective, getRuleByCode } from './rules';
export type { Rule, RuleCode } from './rules';
export { ProductScorer } from './scorer';
export type { ProductScore } from './scorer';
export { PositionScorer } from './position-scorer';
export type {
  SpaceMap,
  PositionScore,
  PositionScoreComponents,
  PositionScoreFlags,
  ZoneHeatmap,
  ZoneSignals,
  PositionScorerParams,
} from './position-scorer';
export {
  buildForcedGroups,
  groupKeyOf,
  sameForcedGroup,
  groupLabel,
} from './grouping';
export type { ForcedGroup, GroupingResult } from './grouping';
export {
  buildAffinityMatrix,
  affinityScore,
  topPartners,
  buildSlowMovers,
  buildWeekdaySignal,
} from './affinity';
export type {
  AffinityMatrix,
  AffinityPair,
  AffinityParams,
  SlowMoverInfo,
  SlowMoversParams,
  WeekdayInfo,
  WeekdayParams,
  WeeklyPattern,
} from './affinity';
export {
  validateDensidadDecreciente,
  validateImanTrafico,
  validateCoherenciaColeccion,
  validateMonotoniaColor,
  validateRitmoTamano,
  validateNumeroImpar,
  validateMuebleSinProductosCompatibles,
  validateStockInsuficiente,
  isRootCauseAlert,
  runAllValidators,
} from './validators';
export type { PlanogramAlert, AlertSeverity, ValidatorInput } from './validators';
export { diffPlanograms, extractRuleCode } from './diff';
export { runRecommender } from './recommender';
export type { Recommendation, RecommenderInput } from './recommender';
export { runScenarios } from './scenarios';
export type { ScenarioResult, ScenarioMetrics, ScenariosOutput } from './scenarios';
