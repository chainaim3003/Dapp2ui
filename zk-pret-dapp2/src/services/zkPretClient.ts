import dotenv from 'dotenv';
dotenv.config();

import axios, { AxiosInstance } from 'axios';
import { spawn } from 'child_process';
import path from 'path';
import { existsSync } from 'fs';
import { logger } from '../utils/logger.js';
import type { ZKPretServerResponse, ToolExecutionResult, ServerStatus, ZKPretClientConfig } from '../types/index.js';

class ZKPretClient {
  private client?: AxiosInstance;
  private config: ZKPretClientConfig;
  private initialized: boolean = false;

  constructor() {
    console.log('=== ZK-PRET CLIENT INITIALIZATION (PRE-COMPILATION STRATEGY) ===');
    console.log('DEBUG: process.env.ZK_PRET_SERVER_TYPE =', process.env.ZK_PRET_SERVER_TYPE);
    console.log('DEBUG: process.env.ZK_PRET_STDIO_PATH =', process.env.ZK_PRET_STDIO_PATH);

    this.config = {
      serverUrl: process.env.ZK_PRET_SERVER_URL || 'http://localhost:3001',
      timeout: parseInt(process.env.ZK_PRET_SERVER_TIMEOUT || '120000'),
      retries: 3,
      serverType: (process.env.ZK_PRET_SERVER_TYPE as any) || 'http',
      stdioPath: process.env.ZK_PRET_STDIO_PATH || '../ZK-PRET-TEST-V3',
      stdioBuildPath: process.env.ZK_PRET_STDIO_BUILD_PATH || './build/tests/with-sign'
    };

    console.log('DEBUG: Final serverType =', this.config.serverType);
    console.log('DEBUG: Final stdioPath =', this.config.stdioPath);
    console.log('DEBUG: Final stdioBuildPath =', this.config.stdioBuildPath);
    console.log('=====================================');

    if (this.config.serverType !== 'stdio') {
      this.client = axios.create({
        baseURL: this.config.serverUrl,
        timeout: this.config.timeout,
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'ZK-PRET-WEB-APP/1.0.0' }
      });
    }
  }

  async initialize(): Promise<void> {
    try {
      await this.healthCheck();
      this.initialized = true;
      logger.info(`ZK-PRET-SERVER client initialized (${this.config.serverType} mode)`);
    } catch (error) {
      logger.warn('ZK-PRET-SERVER client initialization failed', {
        error: error instanceof Error ? error.message : String(error),
        serverType: this.config.serverType,
        stdioPath: this.config.stdioPath
      });
    }
  }

  async healthCheck(): Promise<{ connected: boolean; status?: any }> {
    try {
      if (this.config.serverType === 'stdio') {
        return await this.stdioHealthCheck();
      }
      
      const response = await this.client!.get('/api/health');
      return { connected: true, status: response.data };
    } catch (error) {
      return { connected: false };
    }
  }

  async stdioHealthCheck(): Promise<{ connected: boolean; status?: any }> {
    try {
      console.log('=== STDIO HEALTH CHECK ===');
      console.log('Checking path:', this.config.stdioPath);
      
      const fs = await import('fs/promises');
      await fs.access(this.config.stdioPath!);
      console.log('✅ Main path exists');
      
      const buildPath = path.join(this.config.stdioPath!, this.config.stdioBuildPath!);
      console.log('Checking build path:', buildPath);
      await fs.access(buildPath);
      console.log('✅ Build path exists');
      
      // Check for compiled JavaScript files - Updated with correct filenames
      const jsFiles = [
        'GLEIFOptimMultiCompanyVerificationTestWithSign.js',  // FIXED: Use the actual optimized filename
        'CorporateRegistrationOptimMultiCompanyVerificationTestWithSign.js',  // FIXED: Use the actual optimized filename
        'EXIMOptimMultiCompanyVerificationTestWithSign.js'  // FIXED: Use the actual optimized filename
      ];
      
      console.log('Checking for compiled JavaScript files:');
      for (const file of jsFiles) {
        const filePath = path.join(buildPath, file);
        try {
          await fs.access(filePath);
          console.log(`✅ Found: ${file}`);
        } catch {
          console.log(`❌ Missing: ${file}`);
        }
      }
      
      console.log('=========================');
      
      return {
        connected: true,
        status: { mode: 'stdio', path: this.config.stdioPath, buildPath }
      };
    } catch (error) {
      console.log('❌ STDIO Health Check Failed:', error instanceof Error ? error.message : String(error));
      return { connected: false };
    }
  }

  async listTools(): Promise<string[]> {
    try {
      if (this.config.serverType === 'stdio') {
        return this.getStdioTools();
      }
      
      const response = await this.client!.get('/api/tools');
      return response.data.tools || [];
    } catch (error) {
      return this.getStdioTools();
    }
  }

  getStdioTools(): string[] {
    return [
      'get-GLEIF-verification-with-sign',
      'get-Corporate-Registration-verification-with-sign',
      'get-EXIM-verification-with-sign',
      'get-BSDI-compliance-verification',
      'get-BPI-compliance-verification',
      'get-RiskLiquidityACTUS-Verifier-Test_adv_zk',
      'get-RiskLiquidityACTUS-Verifier-Test_Basel3_Withsign',
      // Composed proof tools
      'execute-composed-proof-full-kyc',
      'execute-composed-proof-financial-risk',
      'execute-composed-proof-business-integrity',
      'execute-composed-proof-comprehensive'
    ];
  }

  async executeTool(toolName: string, parameters: any = {}): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    
    try {
      console.log('=== TOOL EXECUTION START ===');
      console.log('Tool Name:', toolName);
      console.log('Parameters:', JSON.stringify(parameters, null, 2));
      console.log('Server Type:', this.config.serverType);
      
      let result;
      
      if (this.config.serverType === 'stdio') {
        result = await this.executeStdioTool(toolName, parameters);
      } else {
        const response = await this.client!.post('/api/tools/execute', { toolName, parameters });
        result = response.data;
      }

      const executionTime = Date.now() - startTime;
      
      console.log('=== TOOL EXECUTION SUCCESS ===');
      console.log('Execution Time:', `${executionTime}ms`);
      console.log('Result Success:', result.success);
      console.log('==============================');
      
      return {
        success: result.success,
        result: result.result || {
          status: result.success ? 'completed' : 'failed',
          zkProofGenerated: result.success,
          timestamp: new Date().toISOString(),
          output: result.output || ''
        },
        executionTime: `${executionTime}ms`
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      console.log('=== TOOL EXECUTION FAILED ===');
      console.log('Error:', error instanceof Error ? error.message : String(error));
      console.log('Execution Time:', `${executionTime}ms`);
      console.log('=============================');
      
      return {
        success: false,
        result: {
          status: 'failed',
          zkProofGenerated: false,
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        executionTime: `${executionTime}ms`
      };
    }
  }

  async executeStdioTool(toolName: string, parameters: any = {}): Promise<any> {
    // FIXED: Updated toolScriptMap with correct optimized multi-company script filenames
    const toolScriptMap: Record<string, string> = {
      'get-GLEIF-verification-with-sign': 'GLEIFOptimMultiCompanyVerificationTestWithSign.js',  // FIXED: Use the optimized multi-company version
      'get-Corporate-Registration-verification-with-sign': 'CorporateRegistrationOptimMultiCompanyVerificationTestWithSign.js',  // FIXED: Use the optimized multi-company version
      'get-EXIM-verification-with-sign': 'EXIMOptimMultiCompanyVerificationTestWithSign.js',  // FIXED: Use the optimized multi-company version
      'get-BSDI-compliance-verification': 'BusinessStandardDataIntegrityVerificationTest.js',
      'get-BPI-compliance-verification': 'BusinessProcessIntegrityVerificationFileTestWithSign.js',
      'get-RiskLiquidityACTUS-Verifier-Test_adv_zk': 'RiskLiquidityACTUSVerifierTest_adv_zk_WithSign.js',
      'get-RiskLiquidityACTUS-Verifier-Test_Basel3_Withsign': 'RiskLiquidityACTUSVerifierTest_basel3_Withsign.js',
      // Composed proof tools - using optimized recursive versions
      'execute-composed-proof-full-kyc': 'ComposedRecursiveOptim3LevelVerificationTestWithSign.js',  // FIXED: Use actual optimized version
      'execute-composed-proof-financial-risk': 'ComposedRecurrsiveSCF3LevelProofs.js',  // FIXED: Use actual SCF proof version
      'execute-composed-proof-business-integrity': 'ComposedRecursive3LevelVerificationTestWithSign.js',  // FIXED: Use actual 3-level version
      'execute-composed-proof-comprehensive': 'ComposedRecursiveOptim3LevelVerificationTestWithSign.js'  // FIXED: Use actual optimized version
    };

    const scriptFile = toolScriptMap[toolName];
    if (!scriptFile) {
      throw new Error(`Unknown tool: ${toolName}. Available tools: ${Object.keys(toolScriptMap).join(', ')}`);
    }

    console.log('=== STDIO TOOL EXECUTION ===');
    console.log('Tool Name:', toolName);
    console.log('Script File:', scriptFile);
    console.log('============================');
    
    return await this.executePreCompiledScript(scriptFile, parameters, toolName);
  }

  async executePreCompiledScript(scriptFile: string, parameters: any = {}, toolName?: string): Promise<any> {
    const compiledScriptPath = path.join(this.config.stdioPath!, this.config.stdioBuildPath!, scriptFile);
    
    console.log('🔍 Checking for pre-compiled JavaScript file...');
    console.log('Expected compiled script path:', compiledScriptPath);
    
    if (!existsSync(compiledScriptPath)) {
      console.log('❌ Pre-compiled JavaScript file not found');
      console.log('🔧 Attempting to build the project first...');
      
      const buildSuccess = await this.buildProject();
      if (!buildSuccess) {
        throw new Error(`Pre-compiled JavaScript file not found: ${compiledScriptPath}. Please run 'npm run build' in the ZK-PRET-TEST-V3 directory first.`);
      }
      
      if (!existsSync(compiledScriptPath)) {
        throw new Error(`Build completed but compiled file still not found: ${compiledScriptPath}`);
      }
    }
    
    console.log('✅ Pre-compiled JavaScript file found');
    console.log('🚀 Executing compiled JavaScript file...');
    
    return await this.executeJavaScriptFile(compiledScriptPath, parameters, toolName);
  }

  async buildProject(): Promise<boolean> {
    return new Promise((resolve) => {
      console.log('🔨 Building ZK-PRET project...');
      console.log('Working directory:', this.config.stdioPath);
      
      const buildProcess = spawn('npm', ['run', 'build'], {
        cwd: this.config.stdioPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      let stdout = '';
      let stderr = '';

      buildProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        stdout += output;
        console.log('📤 BUILD-STDOUT:', output.trim());
      });

      buildProcess.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        stderr += output;
        console.log('📥 BUILD-STDERR:', output.trim());
      });

      buildProcess.on('close', (code: number | null) => {
        if (code === 0) {
          console.log('✅ Project build completed successfully');
          resolve(true);
        } else {
          console.log('❌ Project build failed with exit code:', code);
          console.log('Build STDERR:', stderr);
          console.log('Build STDOUT:', stdout);
          resolve(false);
        }
      });

      buildProcess.on('error', (error: Error) => {
        console.log('❌ Build process error:', error.message);
        resolve(false);
      });
    });
  }

  async executeJavaScriptFile(scriptPath: string, parameters: any = {}, toolName?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const args = this.prepareScriptArgs(parameters, toolName);
      
      console.log('=== JAVASCRIPT EXECUTION DEBUG ===');
      console.log('Script Path:', scriptPath);
      console.log('Working Directory:', this.config.stdioPath);
      console.log('Arguments:', args);
      console.log('Full Command:', `node ${scriptPath} ${args.join(' ')}`);
      console.log('===================================');
      
      const nodeProcess = spawn('node', [scriptPath, ...args], {
        cwd: this.config.stdioPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { 
          ...process.env,
          NODE_ENV: 'production'
        }
      });

      let stdout = '';
      let stderr = '';
      let isResolved = false;

      const timeoutId = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          nodeProcess.kill('SIGTERM');
          console.log(`❌ EXECUTION TIMEOUT after ${this.config.timeout}ms`);
          reject(new Error(`Script execution timeout after ${this.config.timeout}ms`));
        }
      }, this.config.timeout);

      nodeProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        stdout += output;
        console.log('📤 STDOUT:', output.trim());
      });

      nodeProcess.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        stderr += output;
        console.log('📥 STDERR:', output.trim());
      });

      nodeProcess.on('close', (code: number | null) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutId);
          
          console.log('=== JAVASCRIPT EXECUTION COMPLETE ===');
          console.log('Exit Code:', code);
          console.log('Final STDOUT Length:', stdout.length);
          console.log('Final STDERR Length:', stderr.length);
          console.log('=====================================');
          
          if (code === 0) {
            console.log('✅ JAVASCRIPT EXECUTION SUCCESSFUL');
            
            // Parse actual proof data from stdout if available
            let proofData = null;
            let zkProof = null;
            try {
              // Look for JSON output containing proof data
              const jsonMatches = stdout.match(/\{[^}]*"proof"[^}]*\}/g);
              if (jsonMatches && jsonMatches.length > 0) {
                proofData = JSON.parse(jsonMatches[jsonMatches.length - 1]);
                zkProof = proofData.proof;
              }
            } catch (e) {
              console.log('No parseable proof data found in output');
            }
            
            resolve({
              success: true,
              result: {
                status: 'completed',
                zkProofGenerated: true,
                timestamp: new Date().toISOString(),
                output: stdout,
                stderr: stderr,
                executionStrategy: 'Pre-compiled JavaScript execution (Optimized Multi-Company)',
                // Include actual proof data if found
                ...(proofData && { proofData }),
                ...(zkProof && { zkProof }),
                // Extract key metrics from output
                executionMetrics: this.extractExecutionMetrics(stdout)
              }
            });
          } else {
            console.log(`❌ JAVASCRIPT EXECUTION FAILED with exit code ${code}`);
            reject(new Error(`Script failed with exit code ${code}: ${stderr || stdout || 'No output'}`));
          }
        }
      });

      nodeProcess.on('error', (error: Error) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutId);
          console.log('❌ JAVASCRIPT PROCESS ERROR:', error.message);
          reject(error);
        }
      });

      console.log(`🚀 JavaScript process spawned with PID: ${nodeProcess.pid}`);
    });
  }

  extractExecutionMetrics(output: string): any {
    const metrics: any = {};
    
    try {
      // Extract timing information
      const timingMatches = output.match(/\b(\d+)\s*ms\b/g);
      if (timingMatches) {
        metrics.timings = timingMatches.map(t => t.replace(/\s*ms\b/, ''));
      }
      
      // Extract proof generation info
      if (output.includes('Proof generated successfully')) {
        metrics.proofGenerated = true;
      }
      
      // Extract circuit compilation info
      if (output.includes('Circuit compiled')) {
        metrics.circuitCompiled = true;
      }
      
      // Extract verification info
      if (output.includes('Verification successful')) {
        metrics.verificationSuccessful = true;
      }
      
      // Extract GLEIF-specific metrics
      if (output.includes('GLEIF data fetched')) {
        metrics.gleifDataFetched = true;
      }
      
      // Extract any numeric metrics
      const numericMatches = output.match(/\b\d+\s*(bytes|kb|mb)\b/gi);
      if (numericMatches) {
        metrics.sizeMetrics = numericMatches;
      }
      
    } catch (error) {
      console.log('Error extracting metrics:', error);
    }
    
    return metrics;
  }

  prepareScriptArgs(parameters: any, toolName?: string): string[] {
    console.log('=== PREPARING SCRIPT ARGS ===');
    console.log('Tool Name:', toolName);
    console.log('Input parameters:', parameters);
    
    const args: string[] = [];
    
    // Handle different verification types with their specific parameter requirements
    switch (toolName) {
      case 'get-GLEIF-verification-with-sign':
        // GLEIF OptimMultiCompany verification expects: [companyName] (optimized version may not need TESTNET)
        // Try multiple parameter names for backward compatibility
        const companyName = parameters.companyName || parameters.legalName || parameters.entityName || 'SREE PALANI ANDAVAR AGROS PRIVATE LIMITED';  // FIXED: Added default fallback
        args.push(String(companyName));
        console.log(`Added GLEIF arg 1 (company name): "${companyName}"`);
        // NOTE: OptimMultiCompany version might not need TESTNET parameter, but adding for compatibility
        args.push('TESTNET');
        console.log('Added GLEIF arg 2 (network type): "TESTNET"');
        break;
        
      case 'get-Corporate-Registration-verification-with-sign':
        // Corporate Registration verification expects: [cin, TESTNET]
        const cin = parameters.cin;
        if (cin) {
          args.push(String(cin));
          console.log(`Added Corporate Registration arg 1 (CIN): "${cin}"`);
        } else {
          console.log('⚠️  No CIN found for Corporate Registration verification');
        }
        args.push('TESTNET');
        console.log('Added Corporate Registration arg 2 (network type): "TESTNET"');
        break;
        
      case 'get-EXIM-verification-with-sign':
        // EXIM verification expects: [companyName, TESTNET]
        const eximCompanyName = parameters.companyName || parameters.legalName || parameters.entityName;
        if (eximCompanyName) {
          args.push(String(eximCompanyName));
          console.log(`Added EXIM arg 1 (company name): "${eximCompanyName}"`);
        } else {
          console.log('⚠️  No company name found for EXIM verification');
        }
        args.push('TESTNET');
        console.log('Added EXIM arg 2 (network type): "TESTNET"');
        break;
        
      case 'get-BSDI-compliance-verification':
        // BSDI verification expects: [filePath] as the only argument
        const filePath = parameters.filePath;
        if (filePath) {
          args.push(String(filePath));
          console.log(`Added BSDI arg 1 (file path): "${filePath}"`);
        } else {
          console.log('⚠️  No file path found for BSDI verification');
          args.push('default'); // Use default if no path provided
          console.log('Added BSDI arg 1 (default): "default"');
        }
        break;
        
      case 'get-RiskLiquidityACTUS-Verifier-Test_adv_zk':
      case 'get-RiskLiquidityACTUS-Verifier-Test_Basel3_Withsign':
        // Risk & Liquidity verification expects: [threshold, actusUrl]
        const threshold = parameters.threshold;
        const actusUrl = parameters.actusUrl;
        
        if (threshold !== undefined) {
          args.push(String(threshold));
          console.log(`Added Risk arg 1 (threshold): "${threshold}"`);
        } else {
          console.log('⚠️  No threshold found for Risk verification');
          args.push('0'); // Default threshold
          console.log('Added Risk arg 1 (default threshold): "0"');
        }
        
        if (actusUrl) {
          args.push(String(actusUrl));
          console.log(`Added Risk arg 2 (ACTUS URL): "${actusUrl}"`);
        } else {
          console.log('⚠️  No ACTUS URL found for Risk verification');
          args.push('default-url'); // Default URL placeholder
          console.log('Added Risk arg 2 (default URL): "default-url"');
        }
        break;
        
      default:
        // For other verification types, use the original logic as fallback
        const fallbackCompanyName = parameters.legalName || parameters.entityName || parameters.companyName;
        if (fallbackCompanyName) {
          args.push(String(fallbackCompanyName));
          console.log(`Added fallback arg 1 (company name): "${fallbackCompanyName}"`);
        }
        args.push('TESTNET');
        console.log('Added fallback arg 2 (network type): "TESTNET"');
        break;
    }
    
    console.log('Final args array:', args);
    console.log('Command will be: node script.js', args.map(arg => `"${arg}"`).join(' '));
    console.log('=============================');
    
    return args;
  }

  getServerUrl(): string {
    return this.config.serverType === 'stdio' ? `stdio://${this.config.stdioPath}` : this.config.serverUrl;
  }

  async getServerStatus(): Promise<ServerStatus> {
    try {
      if (this.config.serverType === 'stdio') {
        const healthCheck = await this.stdioHealthCheck();
        return {
          connected: healthCheck.connected,
          status: healthCheck.connected ? 'healthy' : 'disconnected',
          timestamp: new Date().toISOString(),
          serverUrl: this.getServerUrl(),
          serverType: 'stdio'
        };
      }
      
      const response = await this.client!.get('/api/health');
      return {
        connected: true,
        status: response.data.status || 'unknown',
        timestamp: response.data.timestamp,
        serverUrl: this.config.serverUrl,
        serverType: this.config.serverType
      };
    } catch (error) {
      return {
        connected: false,
        status: 'disconnected',
        timestamp: new Date().toISOString(),
        serverUrl: this.getServerUrl(),
        serverType: this.config.serverType,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const zkPretClient = new ZKPretClient();