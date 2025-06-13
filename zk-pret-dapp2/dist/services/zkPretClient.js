import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import { spawn } from 'child_process';
import path from 'path';
import { existsSync } from 'fs';
import { logger } from '../utils/logger.js';
class ZKPretClient {
    client;
    config;
    initialized = false;
    constructor() {
        console.log('=== ZK-PRET CLIENT INITIALIZATION (PRE-COMPILATION STRATEGY) ===');
        console.log('DEBUG: process.env.ZK_PRET_SERVER_TYPE =', process.env.ZK_PRET_SERVER_TYPE);
        console.log('DEBUG: process.env.ZK_PRET_STDIO_PATH =', process.env.ZK_PRET_STDIO_PATH);
        this.config = {
            serverUrl: process.env.ZK_PRET_SERVER_URL || 'http://localhost:3001',
            timeout: parseInt(process.env.ZK_PRET_SERVER_TIMEOUT || '120000'),
            retries: 3,
            serverType: process.env.ZK_PRET_SERVER_TYPE || 'http',
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
    async initialize() {
        try {
            await this.healthCheck();
            this.initialized = true;
            logger.info(`ZK-PRET-SERVER client initialized (${this.config.serverType} mode)`);
        }
        catch (error) {
            logger.warn('ZK-PRET-SERVER client initialization failed', {
                error: error instanceof Error ? error.message : String(error),
                serverType: this.config.serverType,
                stdioPath: this.config.stdioPath
            });
        }
    }
    async healthCheck() {
        try {
            if (this.config.serverType === 'stdio') {
                return await this.stdioHealthCheck();
            }
            const response = await this.client.get('/api/health');
            return { connected: true, status: response.data };
        }
        catch (error) {
            return { connected: false };
        }
    }
    async stdioHealthCheck() {
        try {
            console.log('=== STDIO HEALTH CHECK ===');
            console.log('Checking path:', this.config.stdioPath);
            const fs = await import('fs/promises');
            await fs.access(this.config.stdioPath);
            console.log('✅ Main path exists');
            const buildPath = path.join(this.config.stdioPath, this.config.stdioBuildPath);
            console.log('Checking build path:', buildPath);
            await fs.access(buildPath);
            console.log('✅ Build path exists');
            // Check for compiled JavaScript files
            const jsFiles = [
                'GLEIFVerificationTestWithSign.js',
                'CorporateRegistrationVerificationTestWithSign.js',
                'EXIMVerificationTestWithSign.js'
            ];
            console.log('Checking for compiled JavaScript files:');
            for (const file of jsFiles) {
                const filePath = path.join(buildPath, file);
                try {
                    await fs.access(filePath);
                    console.log(`✅ Found: ${file}`);
                }
                catch {
                    console.log(`❌ Missing: ${file}`);
                }
            }
            console.log('=========================');
            return {
                connected: true,
                status: { mode: 'stdio', path: this.config.stdioPath, buildPath }
            };
        }
        catch (error) {
            console.log('❌ STDIO Health Check Failed:', error instanceof Error ? error.message : String(error));
            return { connected: false };
        }
    }
    async listTools() {
        try {
            if (this.config.serverType === 'stdio') {
                return this.getStdioTools();
            }
            const response = await this.client.get('/api/tools');
            return response.data.tools || [];
        }
        catch (error) {
            return this.getStdioTools();
        }
    }
    getStdioTools() {
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
    async executeTool(toolName, parameters = {}) {
        const startTime = Date.now();
        try {
            console.log('=== TOOL EXECUTION START ===');
            console.log('Tool Name:', toolName);
            console.log('Parameters:', JSON.stringify(parameters, null, 2));
            console.log('Server Type:', this.config.serverType);
            let result;
            if (this.config.serverType === 'stdio') {
                result = await this.executeStdioTool(toolName, parameters);
            }
            else {
                const response = await this.client.post('/api/tools/execute', { toolName, parameters });
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
        }
        catch (error) {
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
    async executeStdioTool(toolName, parameters = {}) {
        const toolScriptMap = {
            'get-GLEIF-verification-with-sign': 'GLEIFVerificationTestWithSign.js',
            'get-Corporate-Registration-verification-with-sign': 'CorporateRegistrationVerificationTestWithSign.js',
            'get-EXIM-verification-with-sign': 'EXIMVerificationTestWithSign.js',
            'get-BSDI-compliance-verification': 'BusinessStandardDataIntegrityVerificationTest.js',
            'get-BPI-compliance-verification': 'BusinessProcessIntegrityVerificationFileTestWithSign.js',
            'get-RiskLiquidityACTUS-Verifier-Test_adv_zk': 'RiskLiquidityACTUSVerifierTest_adv_zk_WithSign.js',
            'get-RiskLiquidityACTUS-Verifier-Test_Basel3_Withsign': 'RiskLiquidityACTUSVerifierTest_basel3_Withsign.js',
            // Composed proof tools
            'execute-composed-proof-full-kyc': 'ComposedProofKYCVerificationTest.js',
            'execute-composed-proof-financial-risk': 'ComposedProofFinancialRiskTest.js',
            'execute-composed-proof-business-integrity': 'ComposedProofBusinessIntegrityTest.js',
            'execute-composed-proof-comprehensive': 'ComposedProofComprehensiveTest.js'
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
    async executePreCompiledScript(scriptFile, parameters = {}, toolName) {
        const compiledScriptPath = path.join(this.config.stdioPath, this.config.stdioBuildPath, scriptFile);
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
    async buildProject() {
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
            buildProcess.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                console.log('📤 BUILD-STDOUT:', output.trim());
            });
            buildProcess.stderr.on('data', (data) => {
                const output = data.toString();
                stderr += output;
                console.log('📥 BUILD-STDERR:', output.trim());
            });
            buildProcess.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ Project build completed successfully');
                    resolve(true);
                }
                else {
                    console.log('❌ Project build failed with exit code:', code);
                    console.log('Build STDERR:', stderr);
                    console.log('Build STDOUT:', stdout);
                    resolve(false);
                }
            });
            buildProcess.on('error', (error) => {
                console.log('❌ Build process error:', error.message);
                resolve(false);
            });
        });
    }
    async executeJavaScriptFile(scriptPath, parameters = {}, toolName) {
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
            nodeProcess.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                console.log('📤 STDOUT:', output.trim());
            });
            nodeProcess.stderr.on('data', (data) => {
                const output = data.toString();
                stderr += output;
                console.log('📥 STDERR:', output.trim());
            });
            nodeProcess.on('close', (code) => {
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
                        resolve({
                            success: true,
                            result: {
                                status: 'completed',
                                zkProofGenerated: true,
                                timestamp: new Date().toISOString(),
                                output: stdout,
                                stderr: stderr,
                                executionStrategy: 'Pre-compiled JavaScript execution'
                            }
                        });
                    }
                    else {
                        console.log(`❌ JAVASCRIPT EXECUTION FAILED with exit code ${code}`);
                        reject(new Error(`Script failed with exit code ${code}: ${stderr || stdout || 'No output'}`));
                    }
                }
            });
            nodeProcess.on('error', (error) => {
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
    prepareScriptArgs(parameters, toolName) {
        console.log('=== PREPARING SCRIPT ARGS ===');
        console.log('Tool Name:', toolName);
        console.log('Input parameters:', parameters);
        const args = [];
        // Handle different verification types with their specific parameter requirements
        switch (toolName) {
            case 'get-GLEIF-verification-with-sign':
                // GLEIF verification expects: [companyName, TESTNET]
                // Try multiple parameter names for backward compatibility
                const companyName = parameters.companyName || parameters.legalName || parameters.entityName;
                if (companyName) {
                    args.push(String(companyName));
                    console.log(`Added GLEIF arg 1 (company name): "${companyName}"`);
                }
                else {
                    console.log('⚠️  No company name found for GLEIF verification');
                }
                args.push('TESTNET');
                console.log('Added GLEIF arg 2 (network type): "TESTNET"');
                break;
            case 'get-Corporate-Registration-verification-with-sign':
                // Corporate Registration verification expects: [cin, TESTNET]
                const cin = parameters.cin;
                if (cin) {
                    args.push(String(cin));
                    console.log(`Added Corporate Registration arg 1 (CIN): "${cin}"`);
                }
                else {
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
                }
                else {
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
                }
                else {
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
                }
                else {
                    console.log('⚠️  No threshold found for Risk verification');
                    args.push('0'); // Default threshold
                    console.log('Added Risk arg 1 (default threshold): "0"');
                }
                if (actusUrl) {
                    args.push(String(actusUrl));
                    console.log(`Added Risk arg 2 (ACTUS URL): "${actusUrl}"`);
                }
                else {
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
    getServerUrl() {
        return this.config.serverType === 'stdio' ? `stdio://${this.config.stdioPath}` : this.config.serverUrl;
    }
    async getServerStatus() {
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
            const response = await this.client.get('/api/health');
            return {
                connected: true,
                status: response.data.status || 'unknown',
                timestamp: response.data.timestamp,
                serverUrl: this.config.serverUrl,
                serverType: this.config.serverType
            };
        }
        catch (error) {
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
//# sourceMappingURL=zkPretClient.js.map