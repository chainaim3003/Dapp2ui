/**
 * ZK-PRET Web Application
 * Clean, modular, and maintainable zero-knowledge proof regulatory technology platform
 */

class ZKPretAsyncApp {
    constructor() {
        this.currentTab = 'compliance';
        this.isAsyncMode = true;
        this.jobs = new Map();
        this.websocket = null;
        this.syncExecuting = false;
        this.gleifComponent = null;
        this.corporateComponent = null;
        this.eximComponent = null;
        this.scfComponent = null;
        this.riskComponent = null;
        this.uploadedFiles = {
            dataFile: null,
            actualProcessFile: null,
            expectedProcessFile: null,
            deepCompositionFile: null
        };

        // Initialize SCF enhancement if available
        if (window.scfEnhancement) {
            Object.assign(this, window.scfEnhancement);
            this.initSCF();
        }

        this.init();
        
        // Debug log
        console.log('🎯 ZK-PRET App constructor completed', {
            currentTab: this.currentTab,
            isAsyncMode: this.isAsyncMode,
            components: {
                gleif: !!this.gleifComponent,
                corporate: !!this.corporateComponent,
                exim: !!this.eximComponent,
                scf: !!this.scfComponent,
                risk: !!this.riskComponent
            }
        });
    }

    async init() {
        console.log('🚀 Initializing ZK-PRET Application...');
        
        this.checkSpecialTabMode();
        this.setupEventListeners();
        this.setupFileDropZones();
        this.initWebSocket();
        await this.checkConnection();
        this.updateModeDisplay();
        
        console.log('✅ ZK-PRET Application initialized successfully');
    }

    // =============================
    // SPECIAL TAB MODE HANDLING
    // =============================
    
    checkSpecialTabMode() {
        const targetTab = sessionStorage.getItem('zkpret_target_tab');
        if (targetTab === 'process-integrity') {
            this.showProcessIntegrityOnly();
        } else if (targetTab === 'data-integrity') {
            this.showDataIntegrityOnly();
        } else if (targetTab === 'risk') {
            this.showRiskOnly();
        } else if (targetTab === 'registry') {
            this.showRegistryOnly();
        }
    }

    showProcessIntegrityOnly() {
        this.showSpecialMode('process-integrity', 'Business Process Integrity Prover | ZK-PRET');
    }

    showDataIntegrityOnly() {
        this.showSpecialMode('data-integrity', 'Business Data Integrity Prover | ZK-PRET');
    }

    showRiskOnly() {
        this.showSpecialMode('risk', 'Risk & Liquidity Prover | ZK-PRET');
    }

    showRegistryOnly() {
        this.showSpecialMode('registry', 'Registry | ZK-PRET');
    }

    showSpecialMode(mode, title) {
        const mainNav = document.querySelector('#tab-navigation nav:first-child');
        const specialNav = document.getElementById(`${mode}-only-nav`);
        
        if (mainNav) mainNav.classList.add('hidden');
        if (specialNav) specialNav.classList.remove('hidden');
        
        // Hide all tabs except the target
        document.querySelectorAll('.tab-content').forEach(content => {
            if (content.id !== `${mode}-tab`) {
                content.style.display = 'none';
            }
        });
        
        const targetTab = document.getElementById(`${mode}-tab`);
        if (targetTab) targetTab.classList.remove('hidden');
        
        this.currentTab = mode;
        document.title = title;
        sessionStorage.removeItem('zkpret_target_tab');
    }

    // =============================
    // EVENT LISTENERS SETUP
    // =============================
    
    setupEventListeners() {
        this.setupTabNavigation();
        this.setupModeToggle();
        this.setupDataInputMethods();
        this.setupExecutionButtons();
        this.setupUtilityButtons();
    }

    setupTabNavigation() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab || e.target.closest('.tab-btn').dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    setupModeToggle() {
        const modeToggle = document.getElementById('async-mode-toggle');
        if (modeToggle) {
            modeToggle.addEventListener('change', (e) => {
                this.isAsyncMode = e.target.checked;
                this.updateModeDisplay();
                this.showNotification(
                    this.isAsyncMode ? 'Async Mode Enabled' : 'Sync Mode Enabled',
                    this.isAsyncMode ? 'Jobs will run in background' : 'Jobs will block UI until complete',
                    'info'
                );
            });
        }
    }

    setupDataInputMethods() {
        document.querySelectorAll('input[name="data-input-method"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.toggleDataInputMethod(e.target.value);
            });
        });
    }

    setupExecutionButtons() {
        const executionButtons = [
            { id: 'gleif-execute-btn', handler: () => this.executeGLEIF() },
            { id: 'corporate-execute-btn', handler: () => this.executeCorporateRegistration() },
            { id: 'exim-execute-btn', handler: () => this.executeEXIM() },
            { id: 'data-integrity-execute-btn', handler: () => this.executeBusinessDataIntegrity() },
            { id: 'process-integrity-execute-btn', handler: () => this.executeBusinessProcessIntegrity() },
            { id: 'risk-execute-btn', handler: () => this.executeRiskLiquidity() },
            { id: 'scf-execute-btn', handler: () => this.executeSCF() },
            { id: 'deep-composition-execute-btn', handler: () => this.executeDeepComposition() },
            { id: 'registry-execute-btn', handler: () => this.executeRegistry() },
            { id: 'composed-proof-execute-btn', handler: () => this.executeComposedProof() }
        ];

        executionButtons.forEach(({ id, handler }) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', handler);
            }
        });
    }

    setupUtilityButtons() {
        // Enhanced mode toggle for GLEIF
        const gleifEnhancedMode = document.getElementById('gleif-enhanced-mode');
        if (gleifEnhancedMode) {
            gleifEnhancedMode.addEventListener('change', (e) => {
                this.toggleGLEIFMode(e.target.checked);
            });
        }

        // Clear completed jobs
        const clearJobsBtn = document.getElementById('clear-completed-jobs');
        if (clearJobsBtn) {
            clearJobsBtn.addEventListener('click', () => this.clearCompletedJobs());
        }
    }

    // =============================
    // FILE MANAGEMENT
    // =============================
    
    setupFileDropZones() {
        const dropZoneConfigs = [
            { zone: 'data-file-drop-zone', input: 'data-file-input', key: 'dataFile' },
            { zone: 'actual-process-drop-zone', input: 'actual-process-input', key: 'actualProcessFile' },
            { zone: 'expected-process-drop-zone', input: 'expected-process-input', key: 'expectedProcessFile' },
            { zone: 'deep-composition-file-drop-zone', input: 'deep-composition-file-input', key: 'deepCompositionFile' }
        ];

        dropZoneConfigs.forEach(config => {
            this.setupDropZone(config.zone, config.input, config.key);
        });
    }

    setupDropZone(dropZoneId, inputId, fileKey) {
        const dropZone = document.getElementById(dropZoneId);
        const fileInput = document.getElementById(inputId);
        
        if (!dropZone || !fileInput) return;

        // Click to browse
        dropZone.addEventListener('click', () => fileInput.click());

        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFile(e.target.files[0], fileKey, dropZoneId);
            }
        });

        // Drag and drop events
        ['dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                
                if (eventName === 'dragover') {
                    dropZone.classList.add('dragover');
                } else if (eventName === 'dragleave') {
                    dropZone.classList.remove('dragover');
                } else if (eventName === 'drop') {
                    dropZone.classList.remove('dragover');
                    if (e.dataTransfer.files.length > 0) {
                        this.handleFile(e.dataTransfer.files[0], fileKey, dropZoneId);
                    }
                }
            });
        });
    }

    handleFile(file, fileKey, dropZoneId) {
        this.uploadedFiles[fileKey] = file;
        this.updateFileDisplay(file, dropZoneId);
    }

    updateFileDisplay(file, dropZoneId) {
        const dropZone = document.getElementById(dropZoneId);
        if (!dropZone) return;

        const placeholder = dropZone.querySelector('.file-placeholder');
        const fileInfo = dropZone.querySelector('.file-info');
        
        if (placeholder) placeholder.style.display = 'none';
        if (fileInfo) {
            fileInfo.classList.add('show');
            const nameElement = fileInfo.querySelector('[id$="-file-name"]');
            const sizeElement = fileInfo.querySelector('[id$="-file-size"]');
            
            if (nameElement) nameElement.textContent = file.name;
            if (sizeElement) sizeElement.textContent = this.formatFileSize(file.size);
        }
        
        dropZone.classList.add('has-file');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // File clearing methods
    clearDataFile() { this.clearFile('dataFile', 'data-file-drop-zone', 'data-file-input'); }
    clearActualProcessFile() { this.clearFile('actualProcessFile', 'actual-process-drop-zone', 'actual-process-input'); }
    clearExpectedProcessFile() { this.clearFile('expectedProcessFile', 'expected-process-drop-zone', 'expected-process-input'); }
    clearDeepCompositionFile() { this.clearFile('deepCompositionFile', 'deep-composition-file-drop-zone', 'deep-composition-file-input'); }

    clearFile(fileKey, dropZoneId, inputId) {
        this.uploadedFiles[fileKey] = null;
        
        const dropZone = document.getElementById(dropZoneId);
        const fileInput = document.getElementById(inputId);
        
        if (dropZone) {
            const placeholder = dropZone.querySelector('.file-placeholder');
            const fileInfo = dropZone.querySelector('.file-info');
            
            if (placeholder) placeholder.style.display = 'flex';
            if (fileInfo) fileInfo.classList.remove('show');
            dropZone.classList.remove('has-file');
        }
        
        if (fileInput) fileInput.value = '';
    }

    // =============================
    // TAB MANAGEMENT
    // =============================
    
    switchTab(tabName) {
        console.log(`🔄 Switching to tab: ${tabName}`);
        
        // Prevent tab switching during sync execution
        if (!this.isAsyncMode && this.syncExecuting) {
            this.showNotification(
                'Execution in Progress',
                'Please wait for current execution to complete or switch to Async mode',
                'warning'
            );
            return;
        }

        // Check if in specialized mode
        const specialNavs = ['process-integrity-only-nav', 'data-integrity-only-nav', 'risk-only-nav', 'registry-only-nav'];
        const inSpecialMode = specialNavs.some(navId => {
            const nav = document.getElementById(navId);
            return nav && !nav.classList.contains('hidden');
        });

        if (inSpecialMode) {
            console.log('⚠️ In special mode, tab switching disabled');
            return; // Don't allow tab switching in special mode
        }

        this.updateTabUI(tabName);
        this.currentTab = tabName;
        
        console.log(`✅ Tab switched to: ${tabName}`);

        // Initialize components when switching to specific tabs
        this.initializeTabComponent(tabName);
    }
    
    initializeTabComponent(tabName) {
        // Initialize GLEIF component when switching to GLEIF tab
        if (tabName === 'gleif' && !this.gleifComponent) {
            if (window.GLEIFComponent) {
                try {
                    this.gleifComponent = new window.GLEIFComponent();
                } catch (error) {
                    console.error('Failed to initialize GLEIF component:', error);
                }
            }
        }
        
        // Initialize Corporate component if needed
        if (tabName === 'corporate' && !this.corporateComponent) {
            if (window.CorporateComponent) {
                try {
                    this.corporateComponent = new window.CorporateComponent();
                } catch (error) {
                    console.error('Failed to initialize Corporate component:', error);
                }
            }
        }
        
        // Initialize EXIM component if needed
        if (tabName === 'exim' && !this.eximComponent) {
            if (window.EximComponent) {
                try {
                    this.eximComponent = new window.EximComponent();
                } catch (error) {
                    console.error('Failed to initialize EXIM component:', error);
                }
            }
        }
        
        // Initialize SCF component if needed
        if (tabName === 'scf' && !this.scfComponent) {
            if (window.SCFComponent) {
                try {
                    this.scfComponent = new window.SCFComponent();
                } catch (error) {
                    console.error('Failed to initialize SCF component:', error);
                }
            }
        }
        
        // Initialize Risk component if needed
        if (tabName === 'risk' && !this.riskComponent) {
            if (window.RiskComponent) {
                try {
                    this.riskComponent = new window.RiskComponent();
                } catch (error) {
                    console.error('Failed to initialize Risk component:', error);
                }
            }
        }
    }

    updateTabUI(tabName) {
        console.log(`📝 Updating UI for tab: ${tabName}`);
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
            console.log(`✅ Tab button for ${tabName} activated`);
        } else {
            console.log(`⚠️ Tab button for ${tabName} not found`);
        }

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
            content.classList.remove('active');
        });
        
        const targetTab = document.getElementById(`${tabName}-tab`);
        if (targetTab) {
            targetTab.classList.remove('hidden');
            targetTab.classList.add('active');
            console.log(`✅ Tab content for ${tabName} shown`);
        } else {
            console.log(`⚠️ Tab content for ${tabName} not found`);
        }
    }

    toggleDataInputMethod(method) {
        const filePathSection = document.getElementById('data-filepath-section');
        const uploadSection = document.getElementById('data-upload-section');
        
        if (!filePathSection || !uploadSection) return;

        if (method === 'filepath') {
            filePathSection.classList.remove('hidden');
            uploadSection.classList.add('hidden');
            this.clearDataFile();
        } else {
            filePathSection.classList.add('hidden');
            uploadSection.classList.remove('hidden');
            const filePathInput = document.getElementById('data-file-path-input');
            if (filePathInput) filePathInput.value = '';
        }
    }

    toggleGLEIFMode(enhanced) {
        const originalForm = document.getElementById('gleif-original-form');
        const enhancedForm = document.getElementById('gleif-enhanced-form');
        
        if (!originalForm || !enhancedForm) return;

        if (enhanced) {
            originalForm.classList.add('hidden');
            enhancedForm.classList.remove('hidden');
            
            if (!this.gleifComponent) {
                try {
                    this.gleifComponent = new GLEIFComponent();
                } catch (error) {
                    console.error('Failed to initialize GLEIFComponent:', error);
                    this.showNotification('Enhancement Error', 'Failed to load enhanced mode', 'error');
                    document.getElementById('gleif-enhanced-mode').checked = false;
                    this.toggleGLEIFMode(false);
                }
            }
        } else {
            originalForm.classList.remove('hidden');
            enhancedForm.classList.add('hidden');
        }
    }

    // =============================
    // EXECUTION METHODS
    // =============================
    
    async executeGLEIF() {
        const companyName = document.getElementById('company-name-input')?.value?.trim();
        const lei = document.getElementById('gleif-lei-input')?.value?.trim();
        const jurisdiction = document.getElementById('gleif-jurisdiction-select')?.value;
        
        if (!companyName) {
            this.showNotification('Missing Information', 'Please enter the Legal Entity Name', 'error');
            return;
        }

        const parameters = {
            companyName: companyName,
            typeOfNet: 'TESTNET'
        };
        
        // Add optional parameters if provided
        if (lei) parameters.entityId = lei;
        if (jurisdiction) parameters.jurisdiction = jurisdiction;

        await this.executeTool('get-GLEIF-verification-with-sign', parameters);
    }

    async executeCorporateRegistration() {
        const companyName = document.getElementById('corporate-company-name-input')?.value?.trim();
        const cin = document.getElementById('cin-input')?.value?.trim();
        const registrationNumber = document.getElementById('corporate-registration-number-input')?.value?.trim();
        const jurisdiction = document.getElementById('corporate-jurisdiction-select')?.value;
        
        if (!companyName) {
            this.showNotification('Missing Information', 'Please enter the Company Name', 'error');
            return;
        }

        const parameters = {
            companyName: companyName,
            typeOfNet: 'TESTNET'
        };
        
        // Add optional parameters if provided
        if (cin) parameters.cin = cin;
        if (registrationNumber) parameters.registrationNumber = registrationNumber;
        if (jurisdiction) parameters.jurisdiction = jurisdiction;

        await this.executeTool('get-Corporate-Registration-verification-with-sign', parameters);
    }

    async executeEXIM() {
        const companyName = document.getElementById('exim-company-name-input')?.value?.trim();
        const licenseNumber = document.getElementById('exim-license-input')?.value?.trim();
        const tradeType = document.getElementById('exim-trade-type-select')?.value;
        const country = document.getElementById('exim-country-select')?.value;
        
        if (!companyName) {
            this.showNotification('Missing Information', 'Please enter the Company Name for EXIM verification', 'error');
            return;
        }

        const parameters = {
            companyName: companyName,
            typeOfNet: 'TESTNET'
        };
        
        // Add optional parameters if provided
        if (licenseNumber) parameters.licenseNumber = licenseNumber;
        if (tradeType) parameters.tradeType = tradeType;
        if (country) parameters.country = country;

        await this.executeTool('get-EXIM-verification-with-sign', parameters);
    }

    async executeBusinessDataIntegrity() {
        const selectedMethod = document.querySelector('input[name="data-input-method"]:checked')?.value;
        let filePath;

        if (selectedMethod === 'filepath') {
            filePath = document.getElementById('data-file-path-input')?.value?.trim() || 'default';
        } else {
            if (!this.uploadedFiles.dataFile) {
                this.showNotification('Missing File', 'Please upload an actual data file', 'error');
                return;
            }
            filePath = this.uploadedFiles.dataFile.name;
        }

        const parameters = { filePath: filePath };
        await this.executeTool('get-BSDI-compliance-verification', parameters);
    }

    async executeBusinessProcessIntegrity() {
        if (!this.uploadedFiles.actualProcessFile || !this.uploadedFiles.expectedProcessFile) {
            this.showNotification('Missing Files', 'Please upload both actual and expected process files', 'error');
            return;
        }

        const processType = document.getElementById('process-type-select')?.value;
        const parameters = {
            actualProcessFile: this.uploadedFiles.actualProcessFile.name,
            expectedProcessFile: this.uploadedFiles.expectedProcessFile.name,
            actualFileContent: await this.readFileContent(this.uploadedFiles.actualProcessFile),
            expectedFileContent: await this.readFileContent(this.uploadedFiles.expectedProcessFile),
            businessProcessType: processType,
            typeOfNet: 'TESTNET'
        };

        await this.executeTool('get-BPI-compliance-verification', parameters);
    }

    async executeRiskLiquidity() {
        const riskType = document.getElementById('risk-type-select')?.value;
        const threshold = document.getElementById('risk-threshold-input')?.value?.trim();
        const actusUrl = document.getElementById('risk-actus-url-input')?.value?.trim();

        if (!threshold) {
            this.showNotification('Missing Information', 'Please enter the threshold value', 'error');
            return;
        }

        if (!actusUrl) {
            this.showNotification('Missing Information', 'Please enter the ACTUS URL', 'error');
            return;
        }

        const thresholdNum = parseInt(threshold);
        if (isNaN(thresholdNum) || thresholdNum < 0 || thresholdNum > 9999) {
            this.showNotification('Invalid Threshold', 'Threshold must be a number between 0 and 9999', 'error');
            return;
        }

        const toolName = riskType === 'ACTUS_ADV' 
            ? 'get-RiskLiquidityACTUS-Verifier-Test_adv_zk'
            : 'get-RiskLiquidityACTUS-Verifier-Test_Basel3_Withsign';

        const parameters = {
            threshold: thresholdNum,
            actusUrl: actusUrl
        };

        await this.executeTool(toolName, parameters);
    }

    async executeSCF() {
        const companyName = document.getElementById('scf-company-name-input')?.value?.trim();
        const supplierName = document.getElementById('scf-supplier-name-input')?.value?.trim();
        const invoiceAmount = document.getElementById('scf-invoice-amount-input')?.value?.trim();
        const financingType = document.getElementById('scf-financing-type-select')?.value;

        // Validate required fields
        if (!companyName || !supplierName || !invoiceAmount) {
            this.showNotification('Missing Information', 'Please fill in all required fields', 'error');
            return;
        }

        const amount = parseFloat(invoiceAmount);
        if (isNaN(amount) || amount <= 0) {
            this.showNotification('Invalid Amount', 'Please enter a valid invoice amount', 'error');
            return;
        }

        if (amount > 10000000 || amount < 1000) {
            this.showNotification('Amount Out of Range', 'Invoice amount must be between $1,000 and $10,000,000', 'error');
            return;
        }

        const parameters = {
            companyName: companyName,
            supplierName: supplierName,
            invoiceAmount: amount,
            financingType: financingType,
            typeOfNet: 'TESTNET'
        };

        await this.executeTool('get-SCF-verification-with-sign', parameters);
    }

    async executeDeepComposition() {
        if (!this.uploadedFiles.deepCompositionFile) {
            this.showNotification('Missing File', 'Please upload an analysis file for DeepComposition', 'error');
            return;
        }

        const analysisType = document.getElementById('deep-composition-type-select')?.value;
        const confidence = document.getElementById('deep-composition-confidence')?.value;
        const maxIterations = document.getElementById('deep-composition-iterations')?.value;

        const confidenceNum = parseFloat(confidence);
        if (isNaN(confidenceNum) || confidenceNum < 0.1 || confidenceNum > 1.0) {
            this.showNotification('Invalid Confidence', 'Confidence threshold must be between 0.1 and 1.0', 'error');
            return;
        }

        const iterationsNum = parseInt(maxIterations);
        if (isNaN(iterationsNum) || iterationsNum < 10 || iterationsNum > 1000) {
            this.showNotification('Invalid Iterations', 'Max iterations must be between 10 and 1000', 'error');
            return;
        }

        const parameters = {
            analysisType: analysisType,
            fileName: this.uploadedFiles.deepCompositionFile.name,
            fileContent: await this.readFileContent(this.uploadedFiles.deepCompositionFile),
            confidence: confidenceNum,
            maxIterations: iterationsNum,
            typeOfNet: 'TESTNET'
        };

        await this.executeTool('get-DeepComposition-analysis-with-sign', parameters);
    }

    async executeRegistry() {
        const operation = document.getElementById('registry-operation-select')?.value;
        const entityName = document.getElementById('registry-entity-name-input')?.value?.trim();
        const entityType = document.getElementById('registry-entity-type-select')?.value;
        const registryId = document.getElementById('registry-identifier-input')?.value?.trim();
        const metadata = document.getElementById('registry-metadata-input')?.value?.trim();

        if (!entityName) {
            this.showNotification('Missing Information', 'Please enter the Entity Name', 'error');
            return;
        }

        let parsedMetadata = null;
        if (metadata) {
            try {
                parsedMetadata = JSON.parse(metadata);
            } catch (error) {
                this.showNotification('Invalid Metadata', 'Please enter valid JSON format for metadata', 'error');
                return;
            }
        }

        const parameters = {
            operation: operation,
            entityName: entityName,
            entityType: entityType,
            registryId: registryId || null,
            metadata: parsedMetadata,
            typeOfNet: 'TESTNET'
        };

        await this.executeTool('get-Registry-operation-with-sign', parameters);
    }

    async executeComposedProof() {
        const selectedTemplate = this.getSelectedTemplate();
        if (!selectedTemplate) {
            this.showNotification('No Template Selected', 'Please select a composition template first', 'error');
            return;
        }

        const globalParameters = this.collectGlobalParameters();
        const executionOptions = this.collectExecutionOptions();
        const composedProofRequest = {
            templateId: selectedTemplate,
            globalParameters,
            executionOptions,
            requestId: `composed-${Date.now()}`
        };

        this.showComposedProofProgress();

        try {
            const response = await fetch('/api/v1/composed-proofs/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(composedProofRequest)
            });

            const result = await response.json();
            
            if (result.success) {
                this.displayComposedProofResult(result.result);
                this.showNotification(
                    'Composed Proof Started',
                    `${selectedTemplate} composition is running`,
                    'info'
                );
            } else {
                throw new Error(result.error || 'Composed proof execution failed');
            }
        } catch (error) {
            this.hideComposedProofProgress();
            this.showNotification('Execution Failed', error.message, 'error');
            this.displayError(error.message);
        }
    }

    // =============================
    // EXECUTION UTILITIES
    // =============================
    
    async executeTool(toolName, parameters) {
        if (this.isAsyncMode) {
            await this.executeAsync(toolName, parameters);
        } else {
            await this.executeSync(toolName, parameters);
        }
    }

    async executeAsync(toolName, parameters) {
        const jobId = this.generateJobId();
        const job = {
            id: jobId,
            toolName,
            parameters,
            status: 'pending',
            startTime: new Date(),
            result: null
        };

        this.jobs.set(jobId, job);
        this.updateJobQueue();
        this.updateJobQueueIndicator();

        // Show initial pending state
        this.displayPendingJob(toolName);

        try {
            const response = await fetch('/api/v1/jobs/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId, toolName, parameters })
            });

            if (!response.ok) throw new Error('Failed to start job');

            job.status = 'running';
            this.updateJobQueue();
            this.showNotification(
                'Job Started',
                `${this.formatToolName(toolName)} is now running in background`,
                'info'
            );
        } catch (error) {
            job.status = 'failed';
            job.error = error.message;
            this.updateJobQueue();
            this.showNotification('Job Failed', error.message, 'error');
        }
    }

    async executeSync(toolName, parameters) {
        this.syncExecuting = true;
        this.displayExecutionProgress();

        try {
            const response = await fetch('/api/v1/tools/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ toolName, parameters })
            });

            const result = await response.json();
            this.displayResult(result);
        } catch (error) {
            this.displayError(error.message);
        } finally {
            this.syncExecuting = false;
        }
    }

    async readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    // =============================
    // JOB MANAGEMENT
    // =============================
    
    initWebSocket() {
        if (!this.isAsyncMode) return;

        try {
            this.websocket = new WebSocket('ws://localhost:3000');
            
            this.websocket.onopen = () => console.log('✅ WebSocket connected');
            this.websocket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'job_update') {
                    this.handleJobUpdate(data);
                }
            };
            this.websocket.onclose = () => {
                console.log('🔌 WebSocket disconnected');
                setTimeout(() => this.initWebSocket(), 5000);
            };
        } catch (error) {
            console.error('❌ WebSocket connection failed:', error);
        }
    }

    handleJobUpdate(data) {
        const job = this.jobs.get(data.jobId);
        if (!job) return;

        Object.assign(job, {
            status: data.status,
            progress: data.progress,
            result: data.result,
            error: data.error
        });

        if (data.status === 'completed' || data.status === 'failed') {
            job.endTime = new Date();
            
            if (data.status === 'completed' && data.result) {
                this.displayResult(data.result);
            } else if (data.status === 'failed') {
                this.displayError(data.error || 'Job execution failed');
            }
            
            this.showNotification(
                data.status === 'completed' ? 'Job Completed' : 'Job Failed',
                `${this.formatToolName(job.toolName)} ${data.status}`,
                data.status === 'completed' ? 'success' : 'error'
            );
        }

        this.updateJobQueue();
        this.updateJobQueueIndicator();
    }

    updateJobQueue() {
        const container = document.getElementById('job-queue-list');
        if (!container) return;

        const jobs = Array.from(this.jobs.values()).reverse();
        
        if (jobs.length === 0) {
            container.innerHTML = `
                <div class="text-center py-6 text-gray-500">
                    <i class="fas fa-clock text-2xl mb-2 opacity-50"></i>
                    <p class="text-sm">No jobs in queue</p>
                </div>
            `;
            return;
        }

        container.innerHTML = jobs.map(job => this.renderJobItem(job)).join('');
    }

    renderJobItem(job) {
        const statusIcons = {
            pending: '⏳',
            running: '🔄',
            completed: '✅',
            failed: '❌'
        };

        return `
            <div class="job-item p-3 border-l-4 ${this.getJobBorderColor(job.status)} bg-gray-50 rounded">
                <div class="flex justify-between items-center">
                    <div>
                        <span class="font-medium">${this.formatToolName(job.toolName)}</span>
                        <div class="text-sm text-gray-500">${job.startTime.toLocaleTimeString()}</div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span>${statusIcons[job.status] || '❓'}</span>
                        <span class="text-sm ${this.getJobStatusColor(job.status)}">${job.status}</span>
                    </div>
                </div>
                ${job.progress ? `
                    <div class="mt-2 w-full bg-gray-200 rounded-full h-2">
                        <div class="bg-blue-600 h-2 rounded-full" style="width: ${job.progress}%"></div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    updateJobQueueIndicator() {
        const runningJobs = Array.from(this.jobs.values())
            .filter(job => job.status === 'running' || job.status === 'pending').length;
        
        const indicator = document.getElementById('job-queue-indicator');
        const counter = document.getElementById('running-jobs-count');
        
        if (counter) counter.textContent = runningJobs;
        if (indicator) {
            indicator.classList.toggle('hidden', runningJobs === 0 || !this.isAsyncMode);
        }
    }

    clearCompletedJobs() {
        for (const [jobId, job] of this.jobs.entries()) {
            if (job.status === 'completed' || job.status === 'failed') {
                this.jobs.delete(jobId);
            }
        }
        this.updateJobQueue();
        this.updateJobQueueIndicator();
    }

    generateJobId() {
        return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    formatToolName(toolName) {
        return toolName
            .replace('get-', '')
            .replace('-with-sign', '')
            .replace('-compliance-verification', '')
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    getJobBorderColor(status) {
        const colors = {
            pending: 'border-yellow-400',
            running: 'border-blue-400',
            completed: 'border-green-400',
            failed: 'border-red-400'
        };
        return colors[status] || 'border-gray-400';
    }

    getJobStatusColor(status) {
        const colors = {
            pending: 'text-yellow-600',
            running: 'text-blue-600',
            completed: 'text-green-600',
            failed: 'text-red-600'
        };
        return colors[status] || 'text-gray-600';
    }

    // =============================
    // UI DISPLAY METHODS
    // =============================
    
    displayPendingJob(toolName) {
        const container = document.getElementById('execution-results');
        if (container) {
            container.innerHTML = `
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div class="flex items-center">
                        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                        <div>
                            <h3 class="text-lg font-semibold text-blue-800">Job Started</h3>
                            <p class="text-blue-700">${this.formatToolName(toolName)} is running in background</p>
                            <p class="text-sm text-blue-600 mt-1">You can switch tabs freely</p>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    displayExecutionProgress() {
        const container = document.getElementById('execution-results');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                    <p class="mt-4 text-gray-600">Generating ZK Proof...</p>
                    <p class="text-sm text-gray-500">This may take a few moments</p>
                    <p class="text-xs text-yellow-600 mt-2">⚠️ Sync mode - UI is blocked. Switch to Async for better experience.</p>
                </div>
            `;
        }
    }

    displayResult(result) {
        const container = document.getElementById('execution-results');
        if (!container) return;

        if (result.success) {
            container.innerHTML = `
                <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div class="flex items-center mb-3">
                        <div class="text-green-600 text-2xl mr-3">✅</div>
                        <div>
                            <h3 class="text-lg font-semibold text-green-800">Success</h3>
                            <p class="text-green-700">ZK Proof Generated Successfully</p>
                        </div>
                    </div>
                    <div class="text-sm text-green-600 space-y-1">
                        <p><strong>Tool:</strong> ${result.toolName || 'ZK Proof Generation'}</p>
                        <p><strong>Status:</strong> ZK Proof Generated</p>
                        <p><strong>Time:</strong> ${result.executionTime || 'N/A'}</p>
                    </div>
                    ${result.result?.output ? `
                        <div class="mt-4 p-3 bg-gray-100 rounded-lg">
                            <h4 class="font-medium text-gray-700 mb-2">Output:</h4>
                            <pre class="text-sm text-gray-600 whitespace-pre-wrap">${result.result.output.substring(0, 500)}${result.result.output.length > 500 ? '...' : ''}</pre>
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            this.displayError(result.error || 'Unknown error');
        }
    }

    displayError(message) {
        const container = document.getElementById('execution-results');
        if (container) {
            container.innerHTML = `
                <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div class="flex items-center">
                        <div class="text-red-600 text-2xl mr-3">❌</div>
                        <div>
                            <h3 class="text-lg font-semibold text-red-800">Failed</h3>
                            <p class="text-red-700">${message}</p>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    // =============================
    // COMPOSED PROOFS UTILITIES
    // =============================
    
    getSelectedTemplate() {
        return window.selectedComposedTemplate || null;
    }

    collectGlobalParameters() {
        return {
            companyName: document.getElementById('composed-company-name')?.value?.trim() || '',
            cin: document.getElementById('composed-cin')?.value?.trim() || '',
            threshold: parseFloat(document.getElementById('composed-threshold')?.value) || 0.7,
            actusUrl: document.getElementById('composed-actus-url')?.value?.trim() || '',
            filePath: document.getElementById('composed-file-path')?.value?.trim() || '',
            processId: document.getElementById('composed-process-id')?.value?.trim() || ''
        };
    }

    collectExecutionOptions() {
        return {
            maxParallelism: parseInt(document.getElementById('composed-max-parallelism')?.value) || 2,
            enableCaching: document.getElementById('composed-enable-caching')?.value === 'true',
            retryPolicy: {
                maxRetries: parseInt(document.getElementById('composed-max-retries')?.value) || 2,
                backoffStrategy: document.getElementById('composed-retry-strategy')?.value || 'FIXED',
                backoffDelay: parseInt(document.getElementById('composed-retry-delay')?.value) || 1000
            }
        };
    }

    showComposedProofProgress() {
        const progressDiv = document.getElementById('composed-proof-progress');
        if (progressDiv) {
            progressDiv.classList.remove('hidden');
            document.getElementById('progress-details').innerHTML = `
                <div class="flex items-center mb-4">
                    <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                    <span class="text-blue-700 font-medium">Executing Composed Proof...</span>
                </div>
                <p class="text-sm text-gray-600">Running multiple verification components</p>
            `;
        }
    }

    hideComposedProofProgress() {
        const progressDiv = document.getElementById('composed-proof-progress');
        if (progressDiv) {
            progressDiv.classList.add('hidden');
        }
    }

    displayComposedProofResult(result) {
        this.hideComposedProofProgress();
        const container = document.getElementById('execution-results');
        
        if (!container) return;

        if (result.success) {
            container.innerHTML = `
                <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div class="flex items-center mb-3">
                        <div class="text-purple-600 text-2xl mr-3">🎯</div>
                        <div>
                            <h3 class="text-lg font-semibold text-purple-800">Composed Proof Completed</h3>
                            <p class="text-purple-700">Multi-component verification successful</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span class="font-medium text-gray-700">Overall Verdict:</span>
                            <span class="text-purple-600 font-bold">${result.overallVerdict}</span>
                        </div>
                        <div>
                            <span class="font-medium text-gray-700">Execution ID:</span>
                            <span class="text-gray-600">${result.executionId?.substring(0, 8)}...</span>
                        </div>
                        <div>
                            <span class="font-medium text-gray-700">Total Components:</span>
                            <span class="text-gray-600">${result.aggregatedResult?.totalComponents || 0}</span>
                        </div>
                        <div>
                            <span class="font-medium text-gray-700">Execution Time:</span>
                            <span class="text-gray-600">${result.executionMetrics?.totalExecutionTime || 'N/A'}</span>
                        </div>
                    </div>
                    <div class="mt-4 flex space-x-4">
                        <div class="text-center">
                            <div class="text-green-600 text-xl font-bold">${result.aggregatedResult?.passedComponents || 0}</div>
                            <div class="text-xs text-green-600">Passed</div>
                        </div>
                        <div class="text-center">
                            <div class="text-red-600 text-xl font-bold">${result.aggregatedResult?.failedComponents || 0}</div>
                            <div class="text-xs text-red-600">Failed</div>
                        </div>
                    </div>
                    ${result.componentResults && result.componentResults.length > 0 ? `
                        <div class="mt-4">
                            <h4 class="font-medium text-gray-700 mb-2">Component Results:</h4>
                            <div class="space-y-1">
                                ${result.componentResults.map(comp => `
                                    <div class="flex justify-between items-center text-sm">
                                        <span class="text-gray-600">${comp.componentId}</span>
                                        <span class="px-2 py-1 rounded text-xs ${comp.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${comp.status}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            this.displayError(result.error || 'Composed proof execution failed');
        }
    }

    // =============================
    // SYSTEM STATUS & CONNECTION
    // =============================
    
    updateModeDisplay() {
        const jobQueuePanel = document.getElementById('job-queue-panel');
        const jobQueueIndicator = document.getElementById('job-queue-indicator');
        
        if (jobQueuePanel) {
            jobQueuePanel.style.display = this.isAsyncMode ? 'block' : 'none';
        }
        
        if (jobQueueIndicator && !this.isAsyncMode) {
            jobQueueIndicator.classList.add('hidden');
        }
    }

    async checkConnection() {
        try {
            const response = await fetch('/api/v1/health');
            const health = await response.json();
            this.updateConnectionStatus(true);
            this.updateServerStatus(health);
        } catch (error) {
            this.updateConnectionStatus(false);
            this.updateServerStatus({ 
                status: 'offline', 
                services: { zkPretServer: false }, 
                timestamp: new Date().toISOString() 
            });
        }
    }

    updateConnectionStatus(connected) {
        const status = document.getElementById('connection-status');
        if (status) {
            status.innerHTML = `
                <div class="flex items-center space-x-2">
                    <div class="w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}"></div>
                    <span class="${connected ? 'text-green-600' : 'text-red-600'}">${connected ? 'Connected' : 'Disconnected'}</span>
                </div>
            `;
        }
    }

    updateServerStatus(status) {
        const container = document.getElementById('server-status');
        if (container) {
            container.innerHTML = `
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span class="text-gray-600">Status:</span>
                        <span class="font-medium">${status.status || 'unknown'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">ZK-PRET Server:</span>
                        <span class="${status.services?.zkPretServer ? 'text-green-600' : 'text-red-600'}">
                            ${status.services?.zkPretServer ? 'Online' : 'Offline'}
                        </span>
                    </div>
                    ${status.services?.asyncJobs !== undefined ? `
                        <div class="flex justify-between">
                            <span class="text-gray-600">Async Jobs:</span>
                            <span class="${status.services?.asyncJobs ? 'text-green-600' : 'text-orange-600'}">
                                ${status.services?.asyncJobs ? 'Enabled' : 'Disabled'}
                            </span>
                        </div>
                    ` : ''}
                    <div class="text-xs text-gray-500">
                        Last updated: ${new Date(status.timestamp).toLocaleString()}
                    </div>
                </div>
            `;
        }
    }

    // =============================
    // NOTIFICATION SYSTEM
    // =============================
    
    showNotification(title, message, type = 'info') {
        const notification = this.createNotification(title, message, type);
        const container = document.getElementById('notifications');
        
        if (container) {
            container.appendChild(notification);
            setTimeout(() => notification.remove(), 5000);
        }
    }

    createNotification(title, message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} bg-white border-l-4 p-4 rounded-lg shadow-lg max-w-md mb-2 animate-slide-in`;
        
        const borderColors = {
            success: 'border-green-500',
            error: 'border-red-500',
            warning: 'border-yellow-500',
            info: 'border-blue-500'
        };
        
        notification.classList.add(borderColors[type] || borderColors.info);
        
        notification.innerHTML = `
            <div class="flex items-start">
                <div class="flex-1">
                    <h4 class="font-semibold text-gray-900">${title}</h4>
                    <p class="text-gray-600 text-sm mt-1">${message}</p>
                </div>
                <button class="ml-4 text-gray-400 hover:text-gray-600 font-bold text-lg" onclick="this.parentElement.parentElement.remove()">
                    ×
                </button>
            </div>
        `;
        
        return notification;
    }
}

// =============================
// GLOBAL UTILITY FUNCTIONS
// =============================

// File management functions for global access
function clearDataFile() {
    if (window.app) window.app.clearDataFile();
}

function clearActualProcessFile() {
    if (window.app) window.app.clearActualProcessFile();
}

function clearExpectedProcessFile() {
    if (window.app) window.app.clearExpectedProcessFile();
}

function clearDeepCompositionFile() {
    if (window.app) window.app.clearDeepCompositionFile();
}

// Composed proof template selection
function selectComposedProofTemplate(templateId) {
    window.selectedComposedTemplate = templateId;
    
    // Update UI to show selected template
    const selectedInfo = document.getElementById('selected-template-info');
    const templateName = document.getElementById('selected-template-name');
    const templateDetails = document.getElementById('template-details');
    
    if (selectedInfo && templateName) {
        selectedInfo.classList.remove('hidden');
        templateName.textContent = templateId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        // Show template-specific details
        const templates = {
            'full-kyc-compliance': {
                description: 'Combines GLEIF entity verification, Corporate Registration validation, and EXIM trade compliance checks',
                components: ['GLEIF Verification', 'Corporate Registration', 'EXIM Verification (Optional)'],
                aggregation: 'All Required (2 out of 3, EXIM optional)',
                estimatedTime: '2-5 minutes'
            },
            'financial-risk-assessment': {
                description: 'Evaluates financial risk using Basel3 compliance and advanced ACTUS risk models',
                components: ['Basel3 Compliance Check', 'ACTUS Advanced Risk Model'],
                aggregation: 'Weighted Scoring (Basel3: 60%, ACTUS: 40%)',
                estimatedTime: '3-7 minutes'
            },
            'business-integrity-check': {
                description: 'Verifies business data integrity and process compliance',
                components: ['Business Standard Data Integrity', 'Business Process Integrity'],
                aggregation: 'All Components Required',
                estimatedTime: '2-4 minutes'
            },
            'comprehensive-compliance': {
                description: 'Complete compliance verification combining all major regulatory checks',
                components: ['KYC Phase', 'Risk Assessment Phase', 'Integrity Verification Phase'],
                aggregation: 'Weighted Multi-Phase (KYC: 40%, Risk: 35%, Integrity: 25%)',
                estimatedTime: '8-15 minutes'
            }
        };
        
        const template = templates[templateId];
        if (template && templateDetails) {
            templateDetails.innerHTML = `
                <div class="space-y-3">
                    <div>
                        <h5 class="font-medium text-gray-800">Description:</h5>
                        <p class="text-sm text-gray-600">${template.description}</p>
                    </div>
                    <div>
                        <h5 class="font-medium text-gray-800">Components:</h5>
                        <div class="flex flex-wrap gap-2 mt-1">
                            ${template.components.map(comp => `
                                <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">${comp}</span>
                            `).join('')}
                        </div>
                    </div>
                    <div>
                        <h5 class="font-medium text-gray-800">Aggregation:</h5>
                        <p class="text-sm text-gray-600">${template.aggregation}</p>
                    </div>
                    <div>
                        <h5 class="font-medium text-gray-800">Estimated Time:</h5>
                        <p class="text-sm text-gray-600">${template.estimatedTime}</p>
                    </div>
                </div>
            `;
        }
    }
    
    // Highlight selected template
    document.querySelectorAll('.bg-white.rounded-lg.p-4.border').forEach(el => {
        el.classList.remove('ring-2', 'ring-purple-500', 'border-purple-300');
    });
    
    const selectedCard = event?.target?.closest('.bg-white.rounded-lg.p-4.border');
    if (selectedCard) {
        selectedCard.classList.add('ring-2', 'ring-purple-500', 'border-purple-300');
    }
    
    if (window.app) {
        window.app.showNotification(
            'Template Selected',
            `${templateName?.textContent} composition template selected`,
            'info'
        );
    }
}

// Load available templates
async function loadAvailableTemplates() {
    const button = document.getElementById('load-templates-btn');
    if (!button) return;
    
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Loading...';
    button.disabled = true;
    
    try {
        const response = await fetch('/api/v1/composed-proofs/templates');
        const data = await response.json();
        
        if (data.templates && data.templates.length > 0) {
            if (window.app) {
                window.app.showNotification(
                    'Templates Loaded',
                    `Found ${data.total} available composition templates`,
                    'success'
                );
            }
            console.log('Available templates:', data.templates);
        } else {
            if (window.app) {
                window.app.showNotification(
                    'No Templates',
                    'No composition templates found on server',
                    'warning'
                );
            }
        }
    } catch (error) {
        if (window.app) {
            window.app.showNotification(
                'Load Failed',
                'Failed to load templates from server',
                'error'
            );
        }
        console.error('Failed to load templates:', error);
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// =============================
// APPLICATION INITIALIZATION
// =============================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize the main application
    window.app = new ZKPretAsyncApp();
    
    // Check if user came from home page with specific tab target
    const targetTab = sessionStorage.getItem('zkpret_target_tab');
    if (targetTab) {
        sessionStorage.removeItem('zkpret_target_tab');
        setTimeout(() => {
            if (window.app.switchTab) {
                window.app.switchTab(targetTab);
            }
        }, 100);
    }
    
    console.log('🎉 ZK-PRET Application ready!');
});

// Add some CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slide-in {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .animate-slide-in {
        animation: slide-in 0.3s ease-out;
    }
    
    .notification {
        transition: all 0.3s ease;
    }
    
    .notification:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }
`;
document.head.appendChild(style);

// Export for global access
window.ZKPretAsyncApp = ZKPretAsyncApp;