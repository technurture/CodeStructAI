import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

// Extension configuration
let extensionConfig: vscode.WorkspaceConfiguration;
let apiUrl: string;
let userToken: string | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('CodeStruct AI extension is now active!');
    
    // Initialize configuration
    extensionConfig = vscode.workspace.getConfiguration('codestruct');
    apiUrl = extensionConfig.get<string>('apiUrl') || 'https://your-app-url.replit.app';
    
    // Load user token from storage
    userToken = context.globalState.get<string>('userToken');
    
    // Register all commands
    registerCommands(context);
    
    // Initialize sidebar provider
    const analysisProvider = new AnalysisProvider(context);
    vscode.window.createTreeView('codestructAnalysis', {
        treeDataProvider: analysisProvider
    });
}

function registerCommands(context: vscode.ExtensionContext) {
    // Analyze entire project
    const analyzeProject = vscode.commands.registerCommand('codestruct.analyzeProject', async () => {
        if (!await checkSubscription(context)) return;
        
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }
        
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Analyzing project with AI...",
                cancellable: false
            }, async (progress: vscode.Progress<{message?: string; increment?: number}>) => {
                progress.report({ increment: 0 });
                
                // Collect project files
                const files = await collectProjectFiles(workspaceFolder.uri.fsPath);
                progress.report({ increment: 30 });
                
                // Send to API for analysis
                const analysis = await analyzeWithAPI(files);
                progress.report({ increment: 70 });
                
                // Show results
                await showAnalysisResults(analysis);
                progress.report({ increment: 100 });
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Analysis failed: ${error}`);
        }
    });
    
    // Analyze current file
    const analyzeFile = vscode.commands.registerCommand('codestruct.analyzeFile', async () => {
        if (!await checkSubscription(context)) return;
        
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active file to analyze');
            return;
        }
        
        try {
            const content = editor.document.getText();
            const fileName = path.basename(editor.document.fileName);
            
            const analysis = await analyzeFileWithAPI(content, fileName);
            await showFileAnalysisResults(analysis, editor);
        } catch (error) {
            vscode.window.showErrorMessage(`File analysis failed: ${error}`);
        }
    });
    
    // Generate documentation
    const generateDocs = vscode.commands.registerCommand('codestruct.generateDocs', async () => {
        if (!await checkSubscription(context)) return;
        
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active file to document');
            return;
        }
        
        try {
            const content = editor.document.getText();
            const fileName = path.basename(editor.document.fileName);
            
            const documented = await generateDocumentationWithAPI(content, fileName);
            
            // Show diff and ask user to apply
            const choice = await vscode.window.showInformationMessage(
                'Documentation generated! Apply changes?',
                'Apply', 'Preview', 'Cancel'
            );
            
            if (choice === 'Apply') {
                await applyChangesToEditor(editor, documented);
            } else if (choice === 'Preview') {
                await showDocumentationPreview(content, documented);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Documentation generation failed: ${error}`);
        }
    });
    
    // Suggest improvements
    const improveCode = vscode.commands.registerCommand('codestruct.improveCode', async () => {
        if (!await checkSubscription(context)) return;
        
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active file to improve');
            return;
        }
        
        try {
            const content = editor.document.getText();
            const fileName = path.basename(editor.document.fileName);
            
            const improvements = await suggestImprovementsWithAPI(content, fileName);
            
            // Show improvements and ask user to apply
            const choice = await vscode.window.showInformationMessage(
                `Found ${improvements.changes?.length || 0} potential improvements! Apply changes?`,
                'Apply', 'Preview', 'Cancel'
            );
            
            if (choice === 'Apply') {
                await applyChangesToEditor(editor, improvements.improved);
            } else if (choice === 'Preview') {
                await showImprovementPreview(content, improvements);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Code improvement failed: ${error}`);
        }
    });
    
    // Open web dashboard
    const openDashboard = vscode.commands.registerCommand('codestruct.openDashboard', async () => {
        vscode.env.openExternal(vscode.Uri.parse(apiUrl));
    });
    
    // Upgrade to Pro
    const upgrade = vscode.commands.registerCommand('codestruct.upgrade', async () => {
        const upgradeUrl = `${apiUrl}/#/subscribe?source=extension`;
        await vscode.env.openExternal(vscode.Uri.parse(upgradeUrl));
        
        vscode.window.showInformationMessage(
            'Opening CodeStruct AI payment portal. Complete your purchase to unlock Pro features.',
            'OK'
        );
    });
    
    // Register all commands
    context.subscriptions.push(
        analyzeProject,
        analyzeFile, 
        generateDocs,
        improveCode,
        openDashboard,
        upgrade
    );
}

// HTTP request helper
async function makeHttpRequest(method: string, url: string, data?: any, headers?: any): Promise<any> {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const postData = data ? JSON.stringify(data) : undefined;
        
        const options = {
            method,
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            headers: {
                'Content-Type': 'application/json',
                ...headers,
                ...(postData && { 'Content-Length': Buffer.byteLength(postData) })
            }
        };
        
        const request = (urlObj.protocol === 'https:' ? https : http).request(options, (response) => {
            let body = '';
            response.on('data', (chunk) => {
                body += chunk;
            });
            
            response.on('end', () => {
                try {
                    const result = JSON.parse(body);
                    resolve(result);
                } catch (error) {
                    reject(new Error(`Invalid JSON response: ${body}`));
                }
            });
        });
        
        request.on('error', (error) => {
            reject(error);
        });
        
        if (postData) {
            request.write(postData);
        }
        request.end();
    });
}

// Check if user has valid subscription
async function checkSubscription(context: vscode.ExtensionContext): Promise<boolean> {
    try {
        if (!userToken) {
            // First time user - register trial
            const result = await makeHttpRequest('POST', `${apiUrl}/api/extension/register`, {});
            userToken = result.token;
            context.globalState.update('userToken', userToken);
        }
        
        // Check subscription status
        const response = await makeHttpRequest('GET', `${apiUrl}/api/extension/subscription`, undefined, {
            Authorization: `Bearer ${userToken}`
        });
        
        const { status, trialExpired } = response.data;
        
        if (trialExpired && status !== 'pro') {
            const choice = await vscode.window.showWarningMessage(
                'Your CodeStruct AI trial has expired. Upgrade to Pro to continue using AI features.',
                'Upgrade Now', 'Learn More', 'Later'
            );
            
            if (choice === 'Upgrade Now') {
                vscode.commands.executeCommand('codestruct.upgrade');
            }
            return false;
        }
        
        return true;
    } catch (error) {
        vscode.window.showErrorMessage(`Subscription check failed: ${error}`);
        return false;
    }
}

// Collect all relevant files from project
async function collectProjectFiles(projectPath: string): Promise<Array<{path: string, content: string, language: string}>> {
    const files: Array<{path: string, content: string, language: string}> = [];
    const maxFiles = 100; // Limit for trial users
    
    const supportedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.go', '.php', '.rb', '.rs'];
    
    async function scanDirectory(dirPath: string) {
        if (files.length >= maxFiles) return;
        
        const items = await fs.promises.readdir(dirPath, { withFileTypes: true });
        
        for (const item of items) {
            if (files.length >= maxFiles) break;
            
            const fullPath = path.join(dirPath, item.name);
            const relativePath = path.relative(projectPath, fullPath);
            
            // Skip node_modules and other common ignore patterns
            if (relativePath.includes('node_modules') || 
                relativePath.includes('.git') ||
                relativePath.includes('dist') ||
                relativePath.includes('build')) {
                continue;
            }
            
            if (item.isDirectory()) {
                await scanDirectory(fullPath);
            } else if (supportedExtensions.includes(path.extname(item.name))) {
                try {
                    const content = await fs.promises.readFile(fullPath, 'utf-8');
                    const language = getLanguageFromExtension(path.extname(item.name));
                    
                    files.push({
                        path: relativePath,
                        content,
                        language
                    });
                } catch (error) {
                    console.warn(`Could not read file ${fullPath}:`, error);
                }
            }
        }
    }
    
    await scanDirectory(projectPath);
    return files;
}

function getLanguageFromExtension(ext: string): string {
    const languageMap: Record<string, string> = {
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.ts': 'typescript', 
        '.tsx': 'typescript',
        '.py': 'python',
        '.java': 'java',
        '.cpp': 'cpp',
        '.c': 'c',
        '.cs': 'csharp',
        '.go': 'go',
        '.php': 'php',
        '.rb': 'ruby',
        '.rs': 'rust'
    };
    return languageMap[ext] || 'text';
}

// API interaction functions
async function analyzeWithAPI(files: Array<{path: string, content: string, language: string}>) {
    const response = await makeHttpRequest('POST', `${apiUrl}/api/extension/analyze`, 
        { files },
        { Authorization: `Bearer ${userToken}` }
    );
    return response;
}

async function analyzeFileWithAPI(content: string, fileName: string) {
    const response = await makeHttpRequest('POST', `${apiUrl}/api/extension/analyze-file`,
        { content, fileName },
        { Authorization: `Bearer ${userToken}` }
    );
    return response;
}

async function generateDocumentationWithAPI(content: string, fileName: string): Promise<string> {
    const response = await makeHttpRequest('POST', `${apiUrl}/api/extension/generate-docs`,
        { content, fileName },
        { Authorization: `Bearer ${userToken}` }
    );
    return response.documented;
}

async function suggestImprovementsWithAPI(content: string, fileName: string) {
    const response = await makeHttpRequest('POST', `${apiUrl}/api/extension/improve`,
        { content, fileName },
        { Authorization: `Bearer ${userToken}` }
    );
    return response;
}

// UI helper functions
async function showAnalysisResults(analysis: any) {
    const panel = vscode.window.createWebviewPanel(
        'codestructAnalysis',
        'CodeStruct Analysis Results',
        vscode.ViewColumn.Two,
        {
            enableScripts: true
        }
    );
    
    panel.webview.html = generateAnalysisHTML(analysis);
}

async function showFileAnalysisResults(analysis: any, editor: vscode.TextEditor) {
    // Show analysis in a quick pick or information message
    const items = analysis.issues?.map((issue: any) => ({
        label: `${issue.type}: ${issue.description}`,
        detail: `Severity: ${issue.severity} | Line: ${issue.line || 'N/A'}`
    })) || [];
    
    if (items.length > 0) {
        vscode.window.showQuickPick(items, {
            title: 'Code Issues Found',
            placeHolder: 'Select an issue to view details'
        });
    } else {
        vscode.window.showInformationMessage('No issues found in this file!');
    }
}

async function applyChangesToEditor(editor: vscode.TextEditor, newContent: string) {
    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(
        editor.document.positionAt(0),
        editor.document.positionAt(editor.document.getText().length)
    );
    edit.replace(editor.document.uri, fullRange, newContent);
    await vscode.workspace.applyEdit(edit);
}

async function showDocumentationPreview(original: string, documented: string) {
    const panel = vscode.window.createWebviewPanel(
        'codestructDiff',
        'Documentation Preview',
        vscode.ViewColumn.Two,
        { enableScripts: true }
    );
    
    panel.webview.html = generateDiffHTML(original, documented, 'Documentation Added');
}

async function showImprovementPreview(original: string, improvements: any) {
    const panel = vscode.window.createWebviewPanel(
        'codestructDiff',
        'Code Improvements Preview',
        vscode.ViewColumn.Two,
        { enableScripts: true }
    );
    
    panel.webview.html = generateDiffHTML(original, improvements.improved, 'Code Improvements');
}

function generateAnalysisHTML(analysis: any): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Analysis Results</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; }
            .section { margin-bottom: 30px; }
            .issue { padding: 10px; margin: 5px 0; border-radius: 5px; }
            .issue.high { background: #fee; border-left: 4px solid #ef4444; }
            .issue.medium { background: #fef3cd; border-left: 4px solid #f59e0b; }
            .issue.low { background: #f0f9ff; border-left: 4px solid #3b82f6; }
            .suggestion { padding: 10px; margin: 5px 0; background: #f8fafc; border-radius: 5px; }
            .language-tag { display: inline-block; padding: 2px 8px; margin: 2px; background: #e2e8f0; border-radius: 12px; font-size: 12px; }
        </style>
    </head>
    <body>
        <h1>🧠 CodeStruct AI Analysis Results</h1>
        
        <div class="section">
            <h2>📊 Detected Languages</h2>
            ${Object.entries(analysis.detectedLanguages || {}).map(([lang, pct]: [string, any]) => 
                `<span class="language-tag">${lang}: ${Math.round(pct * 100)}%</span>`
            ).join('')}
        </div>
        
        <div class="section">
            <h2>🏗️ Architecture</h2>
            <p>${analysis.architecture || 'No specific pattern detected'}</p>
        </div>
        
        <div class="section">
            <h2>⚠️ Issues Found (${analysis.issues?.length || 0})</h2>
            ${(analysis.issues || []).map((issue: any) => `
                <div class="issue ${issue.severity}">
                    <strong>${issue.type}</strong> - ${issue.file}<br>
                    ${issue.description}
                </div>
            `).join('')}
        </div>
        
        <div class="section">
            <h2>💡 Suggestions (${analysis.suggestions?.length || 0})</h2>
            ${(analysis.suggestions || []).map((suggestion: any) => `
                <div class="suggestion">
                    <strong>${suggestion.title}</strong><br>
                    ${suggestion.description}
                </div>
            `).join('')}
        </div>
    </body>
    </html>`;
}

function generateDiffHTML(original: string, improved: string, title: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; }
            .diff-container { display: flex; gap: 20px; }
            .diff-panel { flex: 1; }
            .code-block { background: #f8f9fa; border-radius: 5px; padding: 15px; font-family: 'Courier New', monospace; font-size: 12px; overflow-x: auto; max-height: 500px; overflow-y: auto; }
            .original { border-left: 4px solid #ef4444; }
            .improved { border-left: 4px solid #22c55e; }
        </style>
    </head>
    <body>
        <h1>${title}</h1>
        <div class="diff-container">
            <div class="diff-panel">
                <h3>Original Code</h3>
                <pre class="code-block original">${escapeHtml(original)}</pre>
            </div>
            <div class="diff-panel">
                <h3>Improved Code</h3>
                <pre class="code-block improved">${escapeHtml(improved)}</pre>
            </div>
        </div>
    </body>
    </html>`;
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Sidebar provider for analysis results
class AnalysisProvider implements vscode.TreeDataProvider<AnalysisItem> {
    constructor(private context: vscode.ExtensionContext) {}
    
    getTreeItem(element: AnalysisItem): vscode.TreeItem {
        return element;
    }
    
    getChildren(element?: AnalysisItem): AnalysisItem[] {
        if (!element) {
            return [
                new AnalysisItem('Analyze Project', vscode.TreeItemCollapsibleState.None, 'codestruct.analyzeProject'),
                new AnalysisItem('Open Dashboard', vscode.TreeItemCollapsibleState.None, 'codestruct.openDashboard'),
                new AnalysisItem('Upgrade to Pro', vscode.TreeItemCollapsibleState.None, 'codestruct.upgrade')
            ];
        }
        return [];
    }
}

class AnalysisItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly commandId?: string
    ) {
        super(label, collapsibleState);
        if (commandId) {
            this.command = {
                command: commandId,
                title: label,
                arguments: []
            };
        }
    }
}

export function deactivate() {}