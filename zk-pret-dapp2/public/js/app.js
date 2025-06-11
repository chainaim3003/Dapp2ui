class ZKPretApp {
    constructor() {
        this.currentTab = 'gleif';
        this.isExecuting = false;
        this.serverStatus = null;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.checkConnection();
        this.initializeComponents();
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab || e.target.closest('.tab-btn').dataset.tab);
            });
        });

        // Settings
        document.getElementById('settings-btn').addEventListener('click', () => {
            document.getElementById('settings-modal').classList.remove('hidden');
        });

        ['close-settings', 'cancel-settings'].forEach(id => {
            document.getElementById(id).addEventListener('click', () => {
                document.getElementById('settings-modal').classList.add('hidden');
            });
        });

        document.getElementById('save-settings').addEventListener('click', () => {
            notifications.info('Settings', 'Settings saved (restart required for changes)');
            document.getElementById('settings-modal').classList.add('hidden');
        });
    }

    switchTab(tabName) {
        if (this.isExecuting) {
            notifications.warning('Execution in Progress', 'Please wait for current execution to complete');
            return;
        }

        // Update buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
        document.getElementById(`${tabName}-tab`).classList.remove('hidden');

        this.currentTab = tabName;
    }

    async checkConnection() {
        try {
            const health = await zkpretAPI.healthCheck();
            this.serverStatus = health;
            this.updateConnectionStatus(health.status === 'healthy');
            this.updateServerStatus(health);
        } catch (error) {
            this.updateConnectionStatus(false);
        }
    }

    updateConnectionStatus(connected) {
        const status = document.getElementById('connection-status');
        status.innerHTML = `
            <div class="w-3 h-3 ${connected ? 'bg-green-400' : 'bg-red-400'} rounded-full"></div>
            <span class="text-sm text-gray-600">${connected ? 'Connected' : 'Disconnected'}</span>
        `;
    }

    updateServerStatus(status) {
        const container = document.getElementById('server-status');
        container.innerHTML = `
            <div class="space-y-3">
                <div class="flex items-center justify-between">
                    <span class="text-sm font-medium">Status</span>
                    <span class="status-indicator status-${status.status === 'healthy' ? 'connected' : 'degraded'}">${status.status || 'unknown'}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-sm font-medium">ZK-PRET Server</span>
                    <span class="text-sm ${status.services?.zkPretServer ? 'text-green-600' : 'text-red-600'}">
                        <i class="fas fa-${status.services?.zkPretServer ? 'check' : 'times'} mr-1"></i>
                        ${status.services?.zkPretServer ? 'Online' : 'Offline'}
                    </span>
                </div>
                <div class="text-xs text-gray-500">
                    Last updated: ${new Date(status.timestamp).toLocaleString()}
                </div>
            </div>
        `;
    }

    initializeComponents() {
        new GLEIFComponent();
        new CorporateComponent();
        new EximComponent();
        new ComplianceComponent();
        new RiskComponent();
        new SCFComponent();
    }

    async executeTool(toolName, parameters) {
        if (this.isExecuting) {
            notifications.warning('Execution in Progress', 'Another tool is currently executing');
            return;
        }

        this.isExecuting = true;
        const resultsContainer = document.getElementById('execution-results');
        
        resultsContainer.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-spinner fa-spin text-2xl mb-4 text-blue-600"></i>
                <p>Generating ZK Proof...</p>
                <p class="text-sm text-gray-600 mt-2">This may take a few moments</p>
            </div>
        `;

        try {
            const result = await zkpretAPI.executeTool(toolName, parameters);
            
            if (result.success) {
                notifications.success('Success', 'ZK Proof generated successfully');
                resultsContainer.innerHTML = `
                    <div class="result-card success">
                        <div class="flex items-center mb-2">
                            <i class="fas fa-check-circle text-green-600 mr-2"></i>
                            <span class="font-semibold">Success</span>
                        </div>
                        <div class="space-y-2 text-sm">
                            <div><strong>Tool:</strong> ${toolName}</div>
                            <div><strong>ZK Proof:</strong> ${result.result?.zkProofGenerated ? 'Generated' : 'Failed'}</div>
                            <div><strong>Time:</strong> ${result.executionTime}</div>
                            ${result.result?.output ? `<div class="mt-3"><strong>Output:</strong><div class="code-output mt-1">${result.result.output.substring(0, 500)}${result.result.output.length > 500 ? '...' : ''}</div></div>` : ''}
                        </div>
                    </div>
                `;
            } else {
                notifications.error('Failed', 'ZK Proof generation failed');
                resultsContainer.innerHTML = `
                    <div class="result-card error">
                        <div class="flex items-center mb-2">
                            <i class="fas fa-exclamation-circle text-red-600 mr-2"></i>
                            <span class="font-semibold">Failed</span>
                        </div>
                        <div class="text-sm">
                            <div><strong>Error:</strong> ${result.result?.error || 'Unknown error'}</div>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            notifications.error('Error', error.message);
            resultsContainer.innerHTML = `
                <div class="text-center py-8 text-red-500">
                    <i class="fas fa-exclamation-triangle text-2xl mb-4"></i>
                    <p>Execution failed</p>
                    <p class="text-sm">${error.message}</p>
                </div>
            `;
        } finally {
            this.isExecuting = false;
        }
    }
}

// Global functions for composed proofs functionality
window.selectedComposedTemplate = null;

function selectComposedProofTemplate(templateId) {
    window.selectedComposedTemplate = templateId;
    
    // Update template selection visual feedback
    document.querySelectorAll('[onclick*="selectComposedProofTemplate"]').forEach(el => {
        el.classList.remove('border-blue-400', 'bg-blue-50');
        el.classList.add('border-gray-200', 'bg-white');
    });
    
    const selectedElement = document.querySelector(`[onclick*="${templateId}"]`);
    if (selectedElement) {
        selectedElement.classList.remove('border-gray-200', 'bg-white');
        selectedElement.classList.add('border-blue-400', 'bg-blue-50');
    }
    
    // Show selected template info
    const templateInfo = document.getElementById('selected-template-info');
    const templateName = document.getElementById('selected-template-name');
    const templateDetails = document.getElementById('template-details');
    
    templateInfo.classList.remove('hidden');
    templateName.textContent = templateId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Template-specific details
    const templateDescriptions = {
        'full-kyc-compliance': {
            description: 'Comprehensive KYC verification including GLEIF, Corporate Registration, and EXIM checks',
            components: ['GLEIF Entity Verification', 'Corporate Registration Check', 'EXIM Trade Compliance'],
            aggregation: 'All Required (2/3 minimum)',
            execution: 'Sequential with dependencies'
        },
        'financial-risk-assessment': {
            description: 'Advanced financial risk evaluation using Basel3 and ACTUS protocols',
            components: ['Basel3 Risk Assessment', 'Advanced ACTUS Risk Model'],
            aggregation: 'Weighted (Basel3: 60%, ACTUS: 40%)',
            execution: 'Parallel execution'
        },
        'business-integrity-check': {
            description: 'Comprehensive business integrity verification including data and process integrity',
            components: ['Business Data Integrity (BSDI)', 'Business Process Integrity (BPI)'],
            aggregation: 'All Required',
            execution: 'Parallel execution'
        },
        'comprehensive-compliance': {
            description: 'Complete compliance combining KYC, financial risk, and business integrity assessments',
            components: ['Full KYC Compliance', 'Financial Risk Assessment', 'Business Integrity Check'],
            aggregation: 'Weighted (KYC: 40%, Risk: 35%, Integrity: 25%)',
            execution: 'Complex orchestration with nested templates'
        }
    };
    
    const template = templateDescriptions[templateId];
    if (template) {
        templateDetails.innerHTML = `
            <div class="space-y-3">
                <p class="text-gray-700">${template.description}</p>
                <div>
                    <strong class="text-gray-900">Components:</strong>
                    <ul class="mt-1 space-y-1">
                        ${template.components.map(comp => `<li class="text-sm text-gray-600 flex items-center"><i class="fas fa-check text-green-500 mr-2 text-xs"></i>${comp}</li>`).join('')}
                    </ul>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <strong class="text-gray-900">Aggregation:</strong>
                        <p class="text-sm text-gray-600">${template.aggregation}</p>
                    </div>
                    <div>
                        <strong class="text-gray-900">Execution:</strong>
                        <p class="text-sm text-gray-600">${template.execution}</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Show notification
    if (window.app && window.app.showNotification) {
        window.app.showNotification(
            'Template Selected',
            `${templateName.textContent} template is ready for execution`,
            'info'
        );
    }
}

async function loadAvailableTemplates() {
    try {
        // Show loading state
        const loadBtn = document.getElementById('load-templates-btn');
        const originalText = loadBtn.innerHTML;
        loadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Loading...';
        loadBtn.disabled = true;
        
        // Fetch templates from API
        const response = await window.zkpretAPI.getComposedProofTemplates();
        
        if (response && response.templates) {
            // Update the template cards with real data
            console.log('Available templates:', response.templates);
            
            // Show success notification
            if (window.notifications) {
                window.notifications.success(
                    'Templates Loaded',
                    `Found ${response.total} composition templates in ${response.categories?.length || 0} categories`
                );
            }
        } else {
            throw new Error('Invalid response format');
        }
        
        // Restore button
        loadBtn.innerHTML = originalText;
        loadBtn.disabled = false;
        
    } catch (error) {
        console.error('Failed to load templates:', error);
        
        // Show error notification
        if (window.notifications) {
            window.notifications.error(
                'Failed to Load Templates',
                error.message || 'Could not retrieve composition templates from server'
            );
        }
        
        // Restore button
        const loadBtn = document.getElementById('load-templates-btn');
        loadBtn.innerHTML = '<i class="fas fa-exclamation-triangle mr-2"></i>Retry Loading';
        loadBtn.disabled = false;
    }
}

// File management functions for data integrity
function clearDataFile() {
    const dropZone = document.getElementById('data-file-drop-zone');
    const fileInput = document.getElementById('data-file-input');
    const placeholder = dropZone.querySelector('.file-placeholder');
    const fileInfo = dropZone.querySelector('.file-info');
    
    fileInput.value = '';
    if (window.app && window.app.uploadedFiles) {
        window.app.uploadedFiles.dataFile = null;
    }
    
    placeholder.style.display = 'block';
    fileInfo.classList.remove('show');
    dropZone.classList.remove('has-file');
}

function clearActualProcessFile() {
    const dropZone = document.getElementById('actual-process-drop-zone');
    const fileInput = document.getElementById('actual-process-input');
    const placeholder = dropZone.querySelector('.file-placeholder');
    const fileInfo = dropZone.querySelector('.file-info');
    
    fileInput.value = '';
    if (window.app && window.app.uploadedFiles) {
        window.app.uploadedFiles.actualProcessFile = null;
    }
    
    placeholder.style.display = 'block';
    fileInfo.classList.remove('show');
    dropZone.classList.remove('has-file');
}

function clearExpectedProcessFile() {
    const dropZone = document.getElementById('expected-process-drop-zone');
    const fileInput = document.getElementById('expected-process-input');
    const placeholder = dropZone.querySelector('.file-placeholder');
    const fileInfo = dropZone.querySelector('.file-info');
    
    fileInput.value = '';
    if (window.app && window.app.uploadedFiles) {
        window.app.uploadedFiles.expectedProcessFile = null;
    }
    
    placeholder.style.display = 'block';
    fileInfo.classList.remove('show');
    dropZone.classList.remove('has-file');
}

function clearDeepCompositionFile() {
    const dropZone = document.getElementById('deep-composition-file-drop-zone');
    const fileInput = document.getElementById('deep-composition-file-input');
    const placeholder = dropZone.querySelector('.file-placeholder');
    const fileInfo = dropZone.querySelector('.file-info');
    
    fileInput.value = '';
    if (window.app && window.app.uploadedFiles) {
        window.app.uploadedFiles.deepCompositionFile = null;
    }
    
    placeholder.style.display = 'block';
    fileInfo.classList.remove('show');
    dropZone.classList.remove('has-file');
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new ZKPretApp();
});
