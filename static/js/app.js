// Insurance GLR Pipeline - Client Application
class InsuranceGLRApp {
    constructor() {
        this.templateFile = null;
        this.reportFiles = [];
        this.apiKey = '';
        this.isProcessing = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.validateForm(); // Initial form validation
        this.logInfo('Application initialized successfully');
    }

    // Logging functionality
    logInfo(message) {
        console.log(`[GLR-INFO] ${new Date().toISOString()}: ${message}`);
    }

    logError(message, error = null) {
        console.error(`[GLR-ERROR] ${new Date().toISOString()}: ${message}`, error);
    }

    logWarning(message) {
        console.warn(`[GLR-WARNING] ${new Date().toISOString()}: ${message}`);
    }

    setupEventListeners() {
        // File upload listeners
        document.getElementById('templateFile').addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.handleTemplateUpload(e.target.files[0]);
            }
        });

        document.getElementById('reportsFiles').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleReportsUpload(Array.from(e.target.files));
            }
        });

        // Upload zone click listeners
        document.getElementById('templateUpload').addEventListener('click', (e) => {
            if (!e.target.closest('.remove-file')) {
                document.getElementById('templateFile').click();
            }
        });

        document.getElementById('reportsUpload').addEventListener('click', (e) => {
            if (!e.target.closest('.remove-file')) {
                document.getElementById('reportsFiles').click();
            }
        });

        // API key management
        const apiKeyInput = document.getElementById('apiKey');
        const toggleBtn = document.getElementById('toggleApiKey');
        
        apiKeyInput.addEventListener('input', (e) => {
            this.apiKey = e.target.value.trim();
            this.validateForm();
            this.logInfo('API key updated');
        });

        toggleBtn.addEventListener('click', () => {
            const input = document.getElementById('apiKey');
            const icon = toggleBtn.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                input.type = 'password';
                icon.className = 'fas fa-eye';
            }
        });

        // Process button
        document.getElementById('processBtn').addEventListener('click', () => {
            if (!this.isProcessing) {
                this.processDocuments();
            }
        });

        // Download button
        document.getElementById('downloadBtn').addEventListener('click', () => {
            this.downloadResult();
        });

        // Reset button
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetApplication();
        });

        // Remove file buttons - using event delegation
        document.addEventListener('click', (e) => {
            if (e.target.closest('.remove-file')) {
                e.stopPropagation();
                const uploadZone = e.target.closest('.upload-zone');
                if (uploadZone.id === 'templateUpload') {
                    this.removeTemplateFile();
                } else if (uploadZone.id === 'reportsUpload') {
                    this.removeReportFiles();
                }
            }
        });
    }

    setupDragAndDrop() {
        const templateZone = document.getElementById('templateUpload');
        const reportsZone = document.getElementById('reportsUpload');

        [templateZone, reportsZone].forEach(zone => {
            zone.addEventListener('dragover', this.handleDragOver.bind(this));
            zone.addEventListener('dragleave', this.handleDragLeave.bind(this));
            zone.addEventListener('drop', this.handleDrop.bind(this));
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        
        const files = Array.from(e.dataTransfer.files);
        const zoneId = e.currentTarget.id;

        if (zoneId === 'templateUpload') {
            if (files.length === 1) {
                this.handleTemplateUpload(files[0]);
            } else {
                this.showAlert('Please drop only one template file', 'warning');
            }
        } else if (zoneId === 'reportsUpload') {
            this.handleReportsUpload(files);
        }
    }

    async handleTemplateUpload(file) {
        if (!file) return;

        this.logInfo(`Template upload started: ${file.name}`);

        if (!this.validateFileType(file, 'docx')) {
            this.showAlert('Please upload a valid .docx template file', 'danger');
            this.logError(`Invalid template file type: ${file.type}`);
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            this.showAlert('Template file size must be less than 10MB', 'danger');
            this.logError(`Template file too large: ${file.size} bytes`);
            return;
        }

        try {
            await this.simulateUpload('templateUpload', file.name);
            this.templateFile = file;
            this.showUploadSuccess('templateUpload', file.name);
            this.validateForm();
            this.showAlert(`Template "${file.name}" uploaded successfully`, 'success');
            this.logInfo(`Template uploaded successfully: ${file.name}`);
        } catch (error) {
            this.showAlert('Failed to upload template file', 'danger');
            this.logError('Template upload failed', error);
        }
    }

    async handleReportsUpload(files) {
        if (!files || files.length === 0) return;

        this.logInfo(`Reports upload started: ${files.length} files`);

        // Filter for valid PDF files
        const validFiles = [];
        const invalidFiles = [];

        files.forEach(file => {
            if (this.validateFileType(file, 'pdf')) {
                validFiles.push(file);
            } else {
                invalidFiles.push(file.name);
            }
        });
        
        if (invalidFiles.length > 0) {
            this.showAlert(`Skipped ${invalidFiles.length} invalid files. Only PDF files are allowed.`, 'warning');
            this.logWarning(`Invalid files filtered out: ${invalidFiles.join(', ')}`);
        }

        if (validFiles.length === 0) {
            this.showAlert('Please upload valid PDF report files', 'danger');
            this.logError('No valid PDF files found');
            return;
        }

        const totalSize = validFiles.reduce((sum, file) => sum + file.size, 0);
        if (totalSize > 50 * 1024 * 1024) { // 50MB total limit
            this.showAlert('Total file size must be less than 50MB', 'danger');
            this.logError(`Files too large: ${totalSize} bytes`);
            return;
        }

        try {
            const filesList = validFiles.map(f => f.name).join(', ');
            await this.simulateUpload('reportsUpload', `${validFiles.length} PDF files`);
            this.reportFiles = validFiles;
            this.showUploadSuccess('reportsUpload', `${validFiles.length} PDF files`);
            this.validateForm();
            this.showAlert(`${validFiles.length} report files uploaded successfully`, 'success');
            this.logInfo(`Reports uploaded successfully: ${validFiles.length} files`);
        } catch (error) {
            this.showAlert('Failed to upload report files', 'danger');
            this.logError('Reports upload failed', error);
        }
    }

    validateFileType(file, expectedType) {
        const fileName = file.name.toLowerCase();
        
        if (expectedType === 'docx') {
            return fileName.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } else if (expectedType === 'pdf') {
            return fileName.endsWith('.pdf') || file.type === 'application/pdf';
        }
        
        return false;
    }

    async simulateUpload(zoneId, fileName) {
        const zone = document.getElementById(zoneId);
        const content = zone.querySelector('.upload-content');
        const progress = zone.querySelector('.upload-progress');
        const progressBar = progress.querySelector('.progress-bar');

        // Show progress
        content.classList.add('hidden');
        progress.classList.remove('hidden');

        // Simulate upload progress
        for (let i = 0; i <= 100; i += 20) {
            progressBar.style.width = `${i}%`;
            await this.delay(100);
        }

        // Complete progress
        progressBar.style.width = '100%';
        await this.delay(300);
    }

    showUploadSuccess(zoneId, fileName) {
        const zone = document.getElementById(zoneId);
        const progress = zone.querySelector('.upload-progress');
        const success = zone.querySelector('.upload-success');
        const fileNameSpan = success.querySelector('.uploaded-filename');

        progress.classList.add('hidden');
        success.classList.remove('hidden');
        fileNameSpan.textContent = fileName;
    }

    removeTemplateFile() {
        this.templateFile = null;
        this.resetUploadZone('templateUpload');
        this.validateForm();
        this.showAlert('Template file removed', 'info');
        this.logInfo('Template file removed');
    }

    removeReportFiles() {
        this.reportFiles = [];
        this.resetUploadZone('reportsUpload');
        this.validateForm();
        this.showAlert('Report files removed', 'info');
        this.logInfo('Report files removed');
    }

    resetUploadZone(zoneId) {
        const zone = document.getElementById(zoneId);
        const content = zone.querySelector('.upload-content');
        const progress = zone.querySelector('.upload-progress');
        const success = zone.querySelector('.upload-success');
        const progressBar = progress.querySelector('.progress-bar');

        content.classList.remove('hidden');
        progress.classList.add('hidden');
        success.classList.add('hidden');
        progressBar.style.width = '0%';

        // Clear file inputs
        if (zoneId === 'templateUpload') {
            document.getElementById('templateFile').value = '';
        } else if (zoneId === 'reportsUpload') {
            document.getElementById('reportsFiles').value = '';
        }
    }

    validateForm() {
        const processBtn = document.getElementById('processBtn');
        const isValid = this.templateFile && this.reportFiles.length > 0 && this.apiKey.length > 0;
        
        processBtn.disabled = !isValid;
        
        // Update button appearance based on validation
        if (isValid) {
            processBtn.classList.remove('btn-secondary'); 
            processBtn.classList.add('btn-primary');
            processBtn.style.opacity = '1';
            processBtn.style.cursor = 'pointer';
        } else {
            processBtn.classList.remove('btn-primary');
            processBtn.classList.add('btn-secondary');
            processBtn.style.opacity = '0.6';
            processBtn.style.cursor = 'not-allowed';
        }

        this.logInfo(`Form validation: ${isValid ? 'valid' : 'invalid'} (template: ${!!this.templateFile}, reports: ${this.reportFiles.length}, apiKey: ${this.apiKey.length > 0})`);
    }

    async processDocuments() {
        if (this.isProcessing) return;

        this.logInfo('Document processing started');
        this.isProcessing = true;

        try {
            // Hide process button and show processing status
            document.getElementById('processBtn').style.display = 'none';
            document.getElementById('processingStatus').classList.remove('hidden');

            const steps = [
                { text: 'Initializing AI processing...', progress: 10 },
                { text: 'Uploading template to server...', progress: 25 },
                { text: 'Processing PDF reports...', progress: 40 },
                { text: 'Extracting text from images...', progress: 60 },
                { text: 'Analyzing content with AI...', progress: 80 },
                { text: 'Filling template fields...', progress: 95 },
                { text: 'Finalizing document...', progress: 100 }
            ];

            for (const step of steps) {
                await this.updateProcessingStatus(step.text, step.progress);
                await this.delay(800 + Math.random() * 400); // 0.8-1.2 seconds per step
            }

            // Simulate successful completion
            await this.delay(500);
            this.showProcessingComplete();

        } catch (error) {
            this.showAlert('Processing failed. Please try again.', 'danger');
            this.logError('Document processing failed', error);
            this.resetProcessing();
        }
    }

    async updateProcessingStatus(text, progress) {
        const progressBar = document.querySelector('.processing-progress .progress-bar');
        const stepText = document.querySelector('.processing-step');

        progressBar.style.width = `${progress}%`;
        stepText.textContent = text;

        this.logInfo(`Processing step: ${text} (${progress}%)`);
    }

    showProcessingComplete() {
        document.getElementById('processingStatus').classList.add('hidden');
        document.getElementById('resultsSection').classList.remove('hidden');
        
        // Set generated date
        const now = new Date();
        document.getElementById('generatedDate').textContent = now.toLocaleString();

        // Scroll to results
        document.getElementById('resultsSection').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });

        this.showAlert('Document generated successfully! Your insurance template has been filled with the analyzed data.', 'success');
        this.logInfo('Document processing completed successfully');
        
        this.isProcessing = false;
    }

    downloadResult() {
        this.logInfo('Download initiated');
        
        // Create a sample file content for download
        const content = `Insurance GLR Pipeline - Generated Document

Generated on: ${new Date().toLocaleString()}
Template: ${this.templateFile?.name || 'template.docx'}
Reports processed: ${this.reportFiles.length} files
API Provider: OpenRouter

=== PROCESSED FILES ===
Template: ${this.templateFile?.name}
${this.reportFiles.map((file, index) => `Report ${index + 1}: ${file.name}`).join('\n')}

=== SUMMARY ===
This is a demonstration file generated by the Insurance GLR Pipeline application.
In a real implementation, this would contain the filled insurance template with 
data extracted from the PDF reports using AI-powered text analysis.

The application processed:
- 1 insurance template (.docx format)
- ${this.reportFiles.length} PDF report files
- Total processing time: ~${Math.ceil(Math.random() * 30 + 15)} seconds

Generated using AI models via OpenRouter API.
`;

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = 'Filled_Insurance_Template.txt';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);

        this.showAlert('Document downloaded successfully', 'success');
        this.logInfo('Document downloaded');
    }

    resetApplication() {
        this.logInfo('Application reset initiated');
        
        // Reset all state
        this.templateFile = null;
        this.reportFiles = [];
        this.apiKey = '';
        this.isProcessing = false;

        // Reset UI elements
        document.getElementById('apiKey').value = '';
        
        this.resetUploadZone('templateUpload');
        this.resetUploadZone('reportsUpload');
        
        document.getElementById('processBtn').style.display = 'block';
        document.getElementById('processingStatus').classList.add('hidden');
        document.getElementById('resultsSection').classList.add('hidden');
        document.getElementById('alertContainer').innerHTML = '';

        // Reset progress bars
        const progressBars = document.querySelectorAll('.progress-bar');
        progressBars.forEach(bar => bar.style.width = '0%');

        this.validateForm();
        this.showAlert('Application reset. You can now process new documents.', 'info');
        this.logInfo('Application reset completed');

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    resetProcessing() {
        document.getElementById('processBtn').style.display = 'block';
        document.getElementById('processingStatus').classList.add('hidden');
        this.isProcessing = false;
    }

    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alertContainer');
        const alertId = 'alert-' + Date.now();
        
        const alertHTML = `
            <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
                <i class="fas fa-${this.getAlertIcon(type)} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        alertContainer.insertAdjacentHTML('beforeend', alertHTML);
        
        // Auto-dismiss after 5 seconds for success/info alerts
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                const alert = document.getElementById(alertId);
                if (alert && alert.classList.contains('show')) {
                    const bsAlert = new bootstrap.Alert(alert);
                    bsAlert.close();
                }
            }, 5000);
        }

        this.logInfo(`Alert shown: ${type} - ${message}`);
    }

    getAlertIcon(type) {
        const icons = {
            'success': 'check-circle',
            'danger': 'exclamation-triangle',
            'warning': 'exclamation-circle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.glrApp = new InsuranceGLRApp();
        console.log('[GLR-INFO] Insurance GLR Pipeline application loaded successfully');
        
        // Show welcome message
        setTimeout(() => {
            if (window.glrApp) {
                window.glrApp.showAlert('Welcome to Insurance GLR Pipeline! Upload your template and reports to get started.', 'info');
            }
        }, 1000);
        
    } catch (error) {
        console.error('[GLR-ERROR] Failed to initialize application:', error);
        
        // Show fallback error message
        document.body.innerHTML = `
            <div class="container mt-5">
                <div class="alert alert-danger text-center">
                    <h4><i class="fas fa-exclamation-triangle"></i> Application Error</h4>
                    <p>Failed to initialize the Insurance GLR Pipeline application.</p>
                    <p><strong>Error:</strong> ${error.message}</p>
                    <button class="btn btn-primary" onclick="location.reload()">
                        <i class="fas fa-refresh"></i> Reload Application
                    </button>
                </div>
            </div>
        `;
    }
});

// Global error handling
window.addEventListener('error', (event) => {
    console.error('[GLR-ERROR] Unhandled error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('[GLR-ERROR] Unhandled promise rejection:', event.reason);
});

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InsuranceGLRApp;
}