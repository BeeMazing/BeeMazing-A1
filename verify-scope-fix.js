// Quick verification script to check for common scope issues in the task management files
// This script analyzes the JavaScript code structure to identify potential scope problems

const fs = require('fs');
const path = require('path');

class ScopeVerifier {
    constructor() {
        this.issues = [];
        this.warnings = [];
        this.checksPassed = 0;
        this.checksTotal = 0;
    }

    log(message, type = 'info') {
        const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
        console.log(`${prefix} ${message}`);
    }

    check(description, testFn) {
        this.checksTotal++;
        try {
            const result = testFn();
            if (result) {
                this.log(`${description}`, 'success');
                this.checksPassed++;
            } else {
                this.log(`${description}`, 'error');
                this.issues.push(description);
            }
        } catch (error) {
            this.log(`${description}: ${error.message}`, 'error');
            this.issues.push(`${description}: ${error.message}`);
        }
    }

    warn(description, testFn) {
        try {
            const result = testFn();
            if (!result) {
                this.log(`${description}`, 'warning');
                this.warnings.push(description);
            }
        } catch (error) {
            this.log(`Warning check failed: ${description}`, 'warning');
        }
    }

    analyzeFile(filePath, fileName) {
        if (!fs.existsSync(filePath)) {
            this.log(`File not found: ${fileName}`, 'error');
            return;
        }

        const content = fs.readFileSync(filePath, 'utf8');
        this.log(`\n📁 Analyzing ${fileName}...`);

        // Check for common JavaScript scope issues
        this.check(`${fileName}: No undefined variable references`, () => {
            // Look for common undefined variable patterns
            const undefinedPatterns = [
                /\bisOccurrenceEdit\s+is not defined/,
                /\bisFutureEdit\s+is not defined/,
                /\btargetDate\s+is not defined/,
                /\bsplitDate\s+is not defined/
            ];
            
            return !undefinedPatterns.some(pattern => pattern.test(content));
        });

        this.check(`${fileName}: Form submission handler properly scoped`, () => {
            const hasFormHandler = content.includes('addEventListener("submit"');
            const hasDOMContentLoaded = content.includes('DOMContentLoaded');
            
            if (!hasFormHandler) return true; // No form handler to check
            
            // Check if form handler is inside DOMContentLoaded
            const domLoadedStart = content.indexOf('DOMContentLoaded');
            const formHandlerStart = content.indexOf('addEventListener("submit"');
            
            if (domLoadedStart === -1) return true; // No DOMContentLoaded, might be OK
            
            return formHandlerStart > domLoadedStart;
        });

        this.check(`${fileName}: Variable declarations before usage`, () => {
            // Check for let/const declarations of critical variables
            const criticalVars = ['isOccurrenceEdit', 'isFutureEdit', 'targetDate', 'splitDate'];
            
            return criticalVars.every(varName => {
                const declarationPattern = new RegExp(`(let|const|var)\\s+${varName}`);
                const usagePattern = new RegExp(`\\b${varName}\\b`);
                
                const declarationMatch = content.match(declarationPattern);
                const usageMatch = content.match(usagePattern);
                
                if (!usageMatch) return true; // Variable not used, OK
                if (!declarationMatch) return false; // Used but not declared
                
                return declarationMatch.index < usageMatch.index;
            });
        });

        this.check(`${fileName}: Proper async/await usage`, () => {
            // Check for async functions and proper await usage
            const asyncFunctions = content.match(/async\s+function/g) || [];
            const fetchCalls = content.match(/fetch\s*\(/g) || [];
            const awaitFetch = content.match(/await\s+fetch\s*\(/g) || [];
            
            // If there are fetch calls, they should mostly be awaited
            if (fetchCalls.length === 0) return true;
            
            const awaitRatio = awaitFetch.length / fetchCalls.length;
            return awaitRatio >= 0.8; // Allow some flexibility
        });

        this.warn(`${fileName}: Large function detected`, () => {
            // Warn about very large functions (potential maintainability issue)
            const functionMatches = content.match(/function\s+\w+\s*\([^)]*\)\s*{/g) || [];
            const lines = content.split('\n');
            
            return lines.length < 3000; // Warn if file is very large
        });

        this.warn(`${fileName}: Complex nested structure`, () => {
            // Check for deeply nested structures
            const maxNesting = (content.match(/{/g) || []).length;
            return maxNesting < 50; // Reasonable nesting limit
        });
    }

    analyzeTaskFiles() {
        this.log('🔍 Starting scope verification...\n');

        // Check main task files
        this.analyzeFile(
            path.join(__dirname, 'mobile/3-Tasks/addtasks.html'),
            'addtasks.html'
        );

        this.analyzeFile(
            path.join(__dirname, 'mobile/3-Tasks/tasks.html'),
            'tasks.html'
        );

        this.analyzeFile(
            path.join(__dirname, 'shared/taskrotations.js'),
            'taskrotations.js'
        );

        this.analyzeFile(
            path.join(__dirname, 'backend/server.js'),
            'server.js'
        );
    }

    checkSpecificIssues() {
        this.log('\n🎯 Checking specific scope issues...');

        // Check the specific error that was reported
        const addTasksPath = path.join(__dirname, 'mobile/3-Tasks/addtasks.html');
        if (fs.existsSync(addTasksPath)) {
            const content = fs.readFileSync(addTasksPath, 'utf8');

            this.check('Form handler inside DOMContentLoaded scope', () => {
                // Look for the pattern: DOMContentLoaded ... addEventListener("submit"
                const domContentLoadedIndex = content.indexOf('DOMContentLoaded');
                const formHandlerIndex = content.indexOf('addEventListener("submit"');
                const domContentLoadedEnd = content.indexOf('});', domContentLoadedIndex);

                if (domContentLoadedIndex === -1 || formHandlerIndex === -1) {
                    return false; // Can't verify structure
                }

                // Form handler should be between DOMContentLoaded start and end
                return formHandlerIndex > domContentLoadedIndex && 
                       formHandlerIndex < domContentLoadedEnd;
            });

            this.check('Variables declared before form handler', () => {
                const variableDeclarations = [
                    'let isOccurrenceEdit',
                    'let isFutureEdit', 
                    'let targetDate',
                    'let splitDate'
                ];

                const formHandlerIndex = content.indexOf('addEventListener("submit"');
                
                return variableDeclarations.every(declaration => {
                    const declarationIndex = content.indexOf(declaration);
                    return declarationIndex !== -1 && declarationIndex < formHandlerIndex;
                });
            });

            this.check('No obvious syntax errors in JavaScript', () => {
                // Basic syntax checks
                const braces = (content.match(/{/g) || []).length;
                const closingBraces = (content.match(/}/g) || []).length;
                const parens = (content.match(/\(/g) || []).length;
                const closingParens = (content.match(/\)/g) || []).length;

                return Math.abs(braces - closingBraces) <= 2 && 
                       Math.abs(parens - closingParens) <= 2;
            });
        }
    }

    generateReport() {
        this.log('\n📊 Scope Verification Report');
        this.log('============================\n');

        this.log(`Total Checks: ${this.checksTotal}`);
        this.log(`Passed: ${this.checksPassed}`, 'success');
        this.log(`Failed: ${this.checksTotal - this.checksPassed}`, 
                 this.checksTotal - this.checksPassed === 0 ? 'success' : 'error');
        this.log(`Warnings: ${this.warnings.length}`, 
                 this.warnings.length === 0 ? 'success' : 'warning');

        const successRate = ((this.checksPassed / this.checksTotal) * 100).toFixed(1);
        this.log(`Success Rate: ${successRate}%\n`);

        if (this.issues.length > 0) {
            this.log('🔍 Issues Found:', 'error');
            this.issues.forEach(issue => {
                this.log(`  - ${issue}`, 'error');
            });
            this.log('');
        }

        if (this.warnings.length > 0) {
            this.log('⚠️  Warnings:', 'warning');
            this.warnings.forEach(warning => {
                this.log(`  - ${warning}`, 'warning');
            });
            this.log('');
        }

        if (this.issues.length === 0) {
            this.log('🎉 No critical scope issues detected!', 'success');
            this.log('✅ The recurring task system should work correctly.', 'success');
        } else {
            this.log('⚠️  Critical issues found that need attention.', 'error');
        }

        return {
            success: this.issues.length === 0,
            checksTotal: this.checksTotal,
            checksPassed: this.checksPassed,
            issues: this.issues,
            warnings: this.warnings
        };
    }

    run() {
        this.analyzeTaskFiles();
        this.checkSpecificIssues();
        return this.generateReport();
    }
}

// Run verification if executed directly
if (require.main === module) {
    const verifier = new ScopeVerifier();
    const results = verifier.run();
    
    process.exit(results.success ? 0 : 1);
}

module.exports = ScopeVerifier;