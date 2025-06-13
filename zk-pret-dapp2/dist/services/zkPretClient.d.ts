import type { ToolExecutionResult, ServerStatus } from '../types/index.js';
declare class ZKPretClient {
    private client?;
    private config;
    private initialized;
    constructor();
    initialize(): Promise<void>;
    healthCheck(): Promise<{
        connected: boolean;
        status?: any;
    }>;
    stdioHealthCheck(): Promise<{
        connected: boolean;
        status?: any;
    }>;
    listTools(): Promise<string[]>;
    getStdioTools(): string[];
    executeTool(toolName: string, parameters?: any): Promise<ToolExecutionResult>;
    executeStdioTool(toolName: string, parameters?: any): Promise<any>;
    executePreCompiledScript(scriptFile: string, parameters?: any, toolName?: string): Promise<any>;
    buildProject(): Promise<boolean>;
    executeJavaScriptFile(scriptPath: string, parameters?: any, toolName?: string): Promise<any>;
    extractExecutionMetrics(output: string): any;
    prepareScriptArgs(parameters: any, toolName?: string): string[];
    getServerUrl(): string;
    getServerStatus(): Promise<ServerStatus>;
}
export declare const zkPretClient: ZKPretClient;
export {};
//# sourceMappingURL=zkPretClient.d.ts.map