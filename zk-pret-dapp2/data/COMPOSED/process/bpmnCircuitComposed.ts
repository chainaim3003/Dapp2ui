import { Bool, Field, UInt8, Struct } from 'o1js';

// Composed Proof Circuit for ZK-PRET Compliance System
// This circuit aggregates multiple component proof results into a single composed proof

export class ComponentProofResult extends Struct({
  componentId: Field,
  status: Field, // 0 = FAIL, 1 = PASS, 2 = SKIPPED, 3 = ERROR
  zkProofGenerated: Bool,
  weight: Field, // For weighted aggregation
}) {}

export class ComposedProofAggregation extends Struct({
  totalComponents: Field,
  passedComponents: Field,
  failedComponents: Field,
  skippedComponents: Field,
  aggregationType: Field, // 0 = ALL_REQUIRED, 1 = MAJORITY, 2 = WEIGHTED
  threshold: Field, // Threshold for majority/weighted aggregation
  overallVerdict: Field, // 0 = FAIL, 1 = PASS, 2 = PARTIAL, 3 = ERROR
}) {}

/**
 * Verifies a composed proof by aggregating multiple component results
 * @param componentResults Array of component proof results
 * @param aggregationType Type of aggregation (0=ALL_REQUIRED, 1=MAJORITY, 2=WEIGHTED)
 * @param threshold Threshold for majority/weighted aggregation
 * @returns Boolean indicating if the composed proof is valid
 */
export function verifyComposedProof(
  componentResults: ComponentProofResult[],
  aggregationType: Field,
  threshold: Field
): ComposedProofAggregation {
  
  // Initialize counters
  let totalComponents = Field(componentResults.length);
  let passedComponents = Field(0);
  let failedComponents = Field(0);
  let skippedComponents = Field(0);
  let weightedScore = Field(0);
  let totalWeight = Field(0);
  
  // Count component results
  for (let i = 0; i < componentResults.length; i++) {
    const result = componentResults[i];
    
    // Check if component passed (status = 1)
    const isPassed = result.status.equals(Field(1));
    const isFailed = result.status.equals(Field(0)).or(result.status.equals(Field(3))); // FAIL or ERROR
    const isSkipped = result.status.equals(Field(2));
    
    // Update counters
    passedComponents = passedComponents.add(isPassed.toField());
    failedComponents = failedComponents.add(isFailed.toField());
    skippedComponents = skippedComponents.add(isSkipped.toField());
    
    // For weighted aggregation, accumulate weighted scores
    totalWeight = totalWeight.add(result.weight);
    weightedScore = weightedScore.add(isPassed.toField().mul(result.weight));
  }
  
  // Determine overall verdict based on aggregation type
  let overallVerdict = Field(0); // Default to FAIL
  
  // ALL_REQUIRED (aggregationType = 0)
  const isAllRequired = aggregationType.equals(Field(0));
  const allPassed = passedComponents.equals(totalComponents);
  const allFailed = failedComponents.equals(totalComponents);
  
  // For ALL_REQUIRED: PASS if all passed, FAIL if all failed, PARTIAL otherwise
  const allRequiredVerdict = allPassed.toField().mul(Field(1))
    .add(allFailed.not().and(allPassed.not()).toField().mul(Field(2))); // PARTIAL = 2
  
  // MAJORITY (aggregationType = 1)
  const isMajority = aggregationType.equals(Field(1));
  const majorityMet = passedComponents.greaterThanOrEqual(threshold);
  const majorityVerdict = majorityMet.toField().mul(Field(1)); // PASS = 1 if majority met
  
  // WEIGHTED (aggregationType = 2)
  const isWeighted = aggregationType.equals(Field(2));
  // For weighted: check if weightedScore/totalWeight >= threshold
  // We'll use integer arithmetic: weightedScore >= threshold * totalWeight
  const weightedThresholdMet = weightedScore.greaterThanOrEqual(threshold.mul(totalWeight));
  const weightedVerdict = weightedThresholdMet.toField().mul(Field(1));
  
  // Select verdict based on aggregation type
  overallVerdict = isAllRequired.toField().mul(allRequiredVerdict)
    .add(isMajority.toField().mul(majorityVerdict))
    .add(isWeighted.toField().mul(weightedVerdict));
  
  // Create aggregation result
  return new ComposedProofAggregation({
    totalComponents,
    passedComponents,
    failedComponents,
    skippedComponents,
    aggregationType,
    threshold,
    overallVerdict
  });
}

/**
 * Validates component dependencies in a composed proof
 * @param componentResults Array of component results
 * @param dependencyMatrix 2D array representing dependencies (1 if component i depends on j)
 * @returns Boolean indicating if all dependencies are satisfied
 */
export function validateComponentDependencies(
  componentResults: ComponentProofResult[],
  dependencyMatrix: Field[][]
): Bool {
  let allDependenciesSatisfied = Bool(true);
  
  for (let i = 0; i < componentResults.length; i++) {
    const currentResult = componentResults[i];
    const currentPassed = currentResult.status.equals(Field(1));
    
    // If current component passed, check if all its dependencies also passed
    if (currentPassed.toBoolean()) {
      for (let j = 0; j < componentResults.length; j++) {
        const hasDependency = dependencyMatrix[i][j].equals(Field(1));
        const dependencyResult = componentResults[j];
        const dependencyPassed = dependencyResult.status.equals(Field(1));
        
        // If there's a dependency, it must have passed
        const dependencySatisfied = hasDependency.not().or(dependencyPassed);
        allDependenciesSatisfied = allDependenciesSatisfied.and(dependencySatisfied);
      }
    }
  }
  
  return allDependenciesSatisfied;
}

/**
 * KYC Compliance specific composed proof verification
 * Verifies GLEIF + Corporate Registration + optional EXIM
 */
export function verifyKYCCompliance(
  gleifResult: ComponentProofResult,
  corpRegResult: ComponentProofResult,
  eximResult: ComponentProofResult
): Bool {
  // GLEIF and Corporate Registration are required
  const gleifPassed = gleifResult.status.equals(Field(1));
  const corpRegPassed = corpRegResult.status.equals(Field(1));
  const requiredPassed = gleifPassed.and(corpRegPassed);
  
  // EXIM is optional - if it was attempted, it should pass, but if skipped it's OK
  const eximPassed = eximResult.status.equals(Field(1));
  const eximSkipped = eximResult.status.equals(Field(2));
  const eximAcceptable = eximPassed.or(eximSkipped);
  
  return requiredPassed.and(eximAcceptable);
}

/**
 * Financial Risk Assessment composed proof verification
 * Verifies Basel3 + Advanced Risk with weighted scoring
 */
export function verifyFinancialRiskAssessment(
  basel3Result: ComponentProofResult,
  advancedRiskResult: ComponentProofResult,
  thresholdScore: Field // Expected as percentage * 100 (e.g., 70 for 70%)
): Bool {
  const basel3Weight = Field(60); // 60% weight
  const advancedRiskWeight = Field(40); // 40% weight
  
  const basel3Score = basel3Result.status.equals(Field(1)).toField().mul(basel3Weight);
  const advancedRiskScore = advancedRiskResult.status.equals(Field(1)).toField().mul(advancedRiskWeight);
  
  const totalScore = basel3Score.add(advancedRiskScore);
  const totalWeight = basel3Weight.add(advancedRiskWeight);
  
  // Check if weighted score meets threshold
  return totalScore.greaterThanOrEqual(thresholdScore);
}

/**
 * Business Integrity composed proof verification
 * Verifies both BSDI and BPI (both required)
 */
export function verifyBusinessIntegrity(
  bsdiResult: ComponentProofResult,
  bpiResult: ComponentProofResult
): Bool {
  const bsdiPassed = bsdiResult.status.equals(Field(1));
  const bpiPassed = bpiResult.status.equals(Field(1));
  
  return bsdiPassed.and(bpiPassed);
}

/**
 * Comprehensive compliance verification
 * Combines KYC, Financial Risk, and Business Integrity with weighted scoring
 */
export function verifyComprehensiveCompliance(
  kycVerdict: Field,
  riskVerdict: Field,
  integrityVerdict: Field,
  thresholdScore: Field // Expected as percentage * 100 (e.g., 80 for 80%)
): Bool {
  const kycWeight = Field(40); // 40% weight
  const riskWeight = Field(35); // 35% weight
  const integrityWeight = Field(25); // 25% weight
  
  const kycScore = kycVerdict.equals(Field(1)).toField().mul(kycWeight);
  const riskScore = riskVerdict.equals(Field(1)).toField().mul(riskWeight);
  const integrityScore = integrityVerdict.equals(Field(1)).toField().mul(integrityWeight);
  
  const totalScore = kycScore.add(riskScore).add(integrityScore);
  const totalWeight = kycWeight.add(riskWeight).add(integrityWeight);
  
  // Check if weighted score meets threshold
  return totalScore.greaterThanOrEqual(thresholdScore);
}

/**
 * Process execution verification for composed proofs
 * Verifies that the execution follows the correct sequence and logic
 */
export function verifyProcessExecution(input: UInt8[]): Bool {
  // This implements a simple state machine for composed proof execution
  // States: 0=START, 1=GLEIF_EXEC, 2=CORP_REG_EXEC, 3=EXIM_EXEC, 4=AGGREGATION, 5=END
  
  const num_bytes = input.length;
  let states: Bool[][] = Array.from({ length: num_bytes + 1 }, () => []);
  let state_changed: Bool[] = Array.from({ length: num_bytes }, () => Bool(false));
  
  // Initialize states
  states[0][0] = Bool(true); // START state
  for (let i = 1; i < 6; i++) {
    states[0][i] = Bool(false);
  }
  
  for (let i = 0; i < num_bytes; i++) {
    // Transition from START to GLEIF_EXEC (input 'G' = 71)
    const startToGleif = states[i][0].and(input[i].value.equals(71));
    states[i+1][1] = startToGleif;
    state_changed[i] = state_changed[i].or(states[i+1][1]);
    
    // Transition from GLEIF_EXEC to CORP_REG_EXEC (input 'C' = 67)
    const gleifToCorp = states[i][1].and(input[i].value.equals(67));
    states[i+1][2] = gleifToCorp;
    state_changed[i] = state_changed[i].or(states[i+1][2]);
    
    // Transition from CORP_REG_EXEC to EXIM_EXEC (input 'E' = 69)
    const corpToExim = states[i][2].and(input[i].value.equals(69));
    states[i+1][3] = corpToExim;
    state_changed[i] = state_changed[i].or(states[i+1][3]);
    
    // Transition from EXIM_EXEC to AGGREGATION (input 'A' = 65)
    const eximToAgg = states[i][3].and(input[i].value.equals(65));
    states[i+1][4] = eximToAgg;
    state_changed[i] = state_changed[i].or(states[i+1][4]);
    
    // Transition from AGGREGATION to END (input 'Z' = 90)
    const aggToEnd = states[i][4].and(input[i].value.equals(90));
    states[i+1][5] = aggToEnd;
    state_changed[i] = state_changed[i].or(states[i+1][5]);
    
    // Stay in current state if no transition
    states[i+1][0] = state_changed[i].not().and(states[i][0]);
    states[i+1][1] = state_changed[i].not().and(states[i][1]).or(states[i+1][1]);
    states[i+1][2] = state_changed[i].not().and(states[i][2]).or(states[i+1][2]);
    states[i+1][3] = state_changed[i].not().and(states[i][3]).or(states[i+1][3]);
    states[i+1][4] = state_changed[i].not().and(states[i][4]).or(states[i+1][4]);
    states[i+1][5] = state_changed[i].not().and(states[i][5]).or(states[i+1][5]);
  }
  
  // Verify we reached the END state
  let final_state_result = Bool(false);
  for (let i = 0; i <= num_bytes; i++) {
    final_state_result = final_state_result.or(states[i][5]);
  }
  
  return final_state_result;
}
