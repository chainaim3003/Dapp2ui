// Sample Composed Proof Template for KYC Verification
// This demonstrates how to define a composed proof template

export const fullKYCTemplate = {
  id: 'full-kyc-compliance',
  name: 'Full KYC Compliance',
  description: 'Comprehensive KYC verification including GLEIF, Corporate Registration, and EXIM checks',
  version: '1.0.0',
  components: [
    {
      id: 'gleif-verification',
      toolName: 'get-GLEIF-verification-with-sign',
      parameters: {},
      dependencies: [],
      optional: false,
      timeout: 60000,
      cacheKey: 'gleif-{companyName}'
    },
    {
      id: 'corporate-registration',
      toolName: 'get-Corporate-Registration-verification-with-sign',
      parameters: {},
      dependencies: ['gleif-verification'],
      optional: false,
      timeout: 60000,
      cacheKey: 'corp-reg-{cin}'
    },
    {
      id: 'exim-verification',
      toolName: 'get-EXIM-verification-with-sign',
      parameters: {},
      dependencies: ['gleif-verification'],
      optional: true,
      timeout: 60000,
      cacheKey: 'exim-{companyName}'
    }
  ],
  aggregationLogic: {
    type: 'ALL_REQUIRED',
    threshold: 2 // At least 2 out of 3 must pass (EXIM is optional)
  },
  metadata: {
    category: 'kyc-compliance',
    tags: ['kyc', 'compliance', 'identity', 'verification'],
    author: 'ZK-PRET System',
    created: '2024-01-01T00:00:00.000Z'
  }
};

// Usage example:
// POST /api/v1/composed-proofs/execute
// {
//   "templateId": "full-kyc-compliance",
//   "globalParameters": {
//     "companyName": "Example Corp",
//     "cin": "U12345DL2020PLC123456"
//   },
//   "executionOptions": {
//     "maxParallelism": 3,
//     "enableCaching": true
//   }
// }

export const financialRiskTemplate = {
  id: 'financial-risk-assessment',
  name: 'Financial Risk Assessment',
  description: 'Comprehensive financial risk evaluation using Basel3 and ACTUS protocols',
  version: '1.0.0',
  components: [
    {
      id: 'basel3-verification',
      toolName: 'get-RiskLiquidityACTUS-Verifier-Test_Basel3_Withsign',
      parameters: {},
      dependencies: [],
      optional: false,
      timeout: 120000,
      cacheKey: 'basel3-{threshold}-{actusUrl}'
    },
    {
      id: 'advanced-risk-verification',
      toolName: 'get-RiskLiquidityACTUS-Verifier-Test_adv_zk',
      parameters: {},
      dependencies: [],
      optional: false,
      timeout: 120000,
      cacheKey: 'adv-risk-{threshold}-{actusUrl}'
    }
  ],
  aggregationLogic: {
    type: 'WEIGHTED',
    weights: {
      'basel3-verification': 0.6,
      'advanced-risk-verification': 0.4
    },
    threshold: 0.7 // 70% weighted score required
  },
  metadata: {
    category: 'financial-risk',
    tags: ['risk', 'basel3', 'actus', 'financial'],
    author: 'ZK-PRET System',
    created: '2024-01-01T00:00:00.000Z'
  }
};

export const businessIntegrityTemplate = {
  id: 'business-integrity-check',
  name: 'Business Integrity Check',
  description: 'Comprehensive business integrity verification including data and process integrity',
  version: '1.0.0',
  components: [
    {
      id: 'bsdi-verification',
      toolName: 'get-BSDI-compliance-verification',
      parameters: {},
      dependencies: [],
      optional: false,
      timeout: 90000,
      cacheKey: 'bsdi-{filePath}'
    },
    {
      id: 'bpi-verification',
      toolName: 'get-BPI-compliance-verification',
      parameters: {},
      dependencies: [],
      optional: false,
      timeout: 90000,
      cacheKey: 'bpi-{processId}'
    }
  ],
  aggregationLogic: {
    type: 'ALL_REQUIRED'
  },
  metadata: {
    category: 'business-integrity',
    tags: ['integrity', 'data', 'process', 'compliance'],
    author: 'ZK-PRET System',
    created: '2024-01-01T00:00:00.000Z'
  }
};

export const comprehensiveTemplate = {
  id: 'comprehensive-compliance',
  name: 'Comprehensive Compliance',
  description: 'Full spectrum compliance check combining KYC, financial risk, and business integrity',
  version: '1.0.0',
  components: [
    {
      id: 'kyc-phase',
      toolName: 'composed-proof-execution',
      parameters: { templateId: 'full-kyc-compliance' },
      dependencies: [],
      optional: false,
      timeout: 180000
    },
    {
      id: 'risk-phase',
      toolName: 'composed-proof-execution',
      parameters: { templateId: 'financial-risk-assessment' },
      dependencies: ['kyc-phase'],
      optional: false,
      timeout: 240000
    },
    {
      id: 'integrity-phase',
      toolName: 'composed-proof-execution',
      parameters: { templateId: 'business-integrity-check' },
      dependencies: [],
      optional: false,
      timeout: 180000
    }
  ],
  aggregationLogic: {
    type: 'WEIGHTED',
    weights: {
      'kyc-phase': 0.4,
      'risk-phase': 0.35,
      'integrity-phase': 0.25
    },
    threshold: 0.8 // 80% weighted score required
  },
  metadata: {
    category: 'regulatory-compliance',
    tags: ['comprehensive', 'compliance', 'kyc', 'risk', 'integrity'],
    author: 'ZK-PRET System',
    created: '2024-01-01T00:00:00.000Z'
  }
};

// Custom composition example
export const customCompositionExample = {
  customComposition: {
    components: [
      {
        id: 'custom-gleif',
        toolName: 'get-GLEIF-verification-with-sign',
        parameters: { companyName: 'Custom Corp' },
        dependencies: [],
        optional: false,
        timeout: 60000
      },
      {
        id: 'custom-risk',
        toolName: 'get-RiskLiquidityACTUS-Verifier-Test_Basel3_Withsign',
        parameters: { threshold: 0.8, actusUrl: 'https://custom-actus.example.com' },
        dependencies: ['custom-gleif'],
        optional: false,
        timeout: 120000
      }
    ],
    aggregationLogic: {
      type: 'MAJORITY',
      threshold: 2
    }
  },
  globalParameters: {
    networkType: 'TESTNET'
  },
  executionOptions: {
    maxParallelism: 2,
    enableCaching: true,
    retryPolicy: {
      maxRetries: 2,
      backoffStrategy: 'EXPONENTIAL',
      backoffDelay: 1000
    }
  }
};
