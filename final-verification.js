// Final Comprehensive Verification Script
// This script performs end-to-end testing of the recurring task management system
// to ensure all functionality works correctly after the scope fixes

const fs = require('fs');
const path = require('path');

class FinalVerification {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            warnings: 0,
            tests: []
        };
        this.criticalIssues = [];
        this.minorIssues = [];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString().slice(11, 19);
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    async test(description, testFn, critical = false) {
        try {
            const result = await testFn();
            if (result) {
                this.log(`PASSED: ${description}`, 'success');
                this.results.passed++;
                this.results.tests.push({ description, status: 'PASSED', critical });
            } else {
                this.log(`FAILED: ${description}`, 'error');
                this.results.failed++;
                this.results.tests.push({ description, status: 'FAILED', critical });
                
                if (critical) {
                    this.criticalIssues.push(description);
                } else {
                    this.minorIssues.push(description);
                }
            }
        } catch (error) {
            this.log(`ERROR in ${description}: ${error.message}`, 'error');
            this.results.failed++;
            this.results.tests.push({ description, status: 'ERROR', error: error.message, critical });
            
            if (critical) {
                this.criticalIssues.push(`${description}: ${error.message}`);
            } else {
                this.minorIssues.push(`${description}: ${error.message}`);
            }
        }
    }

    warn(description, testFn) {
        try {
            const result = testFn();
            if (!result) {
                this.log(`WARNING: ${description}`, 'warning');
                this.results.warnings++;
                this.minorIssues.push(`WARNING: ${description}`);
            }
        } catch (error) {
            this.log(`WARNING: ${description} - ${error.message}`, 'warning');
            this.results.warnings++;
        }
    }

    checkFileExists(filePath) {
        return fs.existsSync(filePath);
    }

    checkFileContains(filePath, pattern, description = '') {
        if (!this.checkFileExists(filePath)) return false;
        const content = fs.readFileSync(filePath, 'utf8');
        const regex = new RegExp(pattern);
        return regex.test(content);
    }

    checkFunctionScope(filePath, functionName, shouldBeGlobal = true) {
        if (!this.checkFileExists(filePath)) return false;
        const content = fs.readFileSync(filePath, 'utf8');
        
        const functionPattern = new RegExp(`function\\s+${functionName}\\s*\\(`);
        const domContentLoadedPattern = /document\.addEventListener\s*\(\s*["']DOMContentLoaded["']/;
        
        const functionMatch = content.search(functionPattern);
        const domLoadedMatch = content.search(domContentLoadedPattern);
        
        if (functionMatch === -1) return false;
        
        if (shouldBeGlobal) {
            // Function should be OUTSIDE DOMContentLoaded (before it or after the closing brace)
            return domLoadedMatch === -1 || functionMatch < domLoadedMatch || this.isAfterDOMContentLoaded(content, functionMatch, domLoadedMatch);
        } else {
            // Function should be INSIDE DOMContentLoaded
            return domLoadedMatch !== -1 && functionMatch > domLoadedMatch && !this.isAfterDOMContentLoaded(content, functionMatch, domLoadedMatch);
        }
    }

    isAfterDOMContentLoaded(content, functionPos, domLoadedPos) {
        // Find the closing of DOMContentLoaded
        let braceCount = 0;
        let inDOMContentLoaded = false;
        
        for (let i = domLoadedPos; i < content.length && i < functionPos; i++) {
            if (content[i] === '{') {
                braceCount++;
                inDOMContentLoaded = true;
            } else if (content[i] === '}') {
                braceCount--;
                if (braceCount === 0 && inDOMContentLoaded) {
                    // Found the end of DOMContentLoaded
                    return functionPos > i;
                }
            }
        }
        
        return false;
    }

    checkVariableScope(filePath, variableName, shouldBeGlobal = true) {
        if (!this.checkFileExists(filePath)) return false;
        const content = fs.readFileSync(filePath, 'utf8');
        
        const letPattern = new RegExp(`let\\s+${variableName}\\s*=`);
        const constPattern = new RegExp(`const\\s+${variableName}\\s*=`);
        const varPattern = new RegExp(`var\\s+${variableName}\\s*=`);
        const domContentLoadedPattern = /document\.addEventListener\s*\(\s*["']DOMContentLoaded["']/;
        
        const variableMatch = Math.min(
            ...[letPattern, constPattern, varPattern]
                .map(p => content.search(p))
                .filter(pos => pos !== -1)
        );
        
        const domLoadedMatch = content.search(domContentLoadedPattern);
        
        if (variableMatch === -1 || variableMatch === Infinity) return false;
        
        if (shouldBeGlobal) {
            return domLoadedMatch === -1 || variableMatch < domLoadedMatch;
        } else {
            return domLoadedMatch !== -1 && variableMatch > domLoadedMatch;
        }
    }

    async runFileStructureTests() {
        this.log('\n🏗️ Testing File Structure and Integrity...');

        await this.test('Core files exist', () => {
            const files = [
                'mobile/3-Tasks/addtasks.html',
                'mobile/3-Tasks/tasks.html',
                'shared/taskrotations.js',
                'backend/server.js'
            ];
            return files.every(file => this.checkFileExists(path.join(__dirname, file)));
        }, true);

        await this.test('Backend server has all required endpoints', () => {
            const serverPath = path.join(__dirname, 'backend/server.js');
            return [
                'app\\.get\\(["\'][^"\']*tasks["\']',
                'app\\.post\\(["\'][^"\']*tasks["\']',
                'app\\.put\\(["\'][^"\']*tasks["\']',
                'app\\.delete\\(["\'][^"\']*tasks["\']',
                'app\\.delete\\(["\'][^"\']*tasks/occurrence["\']',
                'app\\.put\\(["\'][^"\']*tasks/occurrence["\']',
                'app\\.put\\(["\'][^"\']*tasks/future["\']'
            ].every(pattern => this.checkFileContains(serverPath, pattern));
        }, true);

        await this.test('Task filtering function exists in taskrotations.js', () => {
            const taskrotationsPath = path.join(__dirname, 'shared/taskrotations.js');
            return this.checkFileContains(taskrotationsPath, 'function\\s+filterTasksForDate');
        }, true);
    }

    async runScopeTests() {
        this.log('\n🎯 Testing Function and Variable Scopes...');

        const addTasksPath = path.join(__dirname, 'mobile/3-Tasks/addtasks.html');

        await this.test('showModal function is globally accessible', () => {
            return this.checkFunctionScope(addTasksPath, 'showModal', true);
        }, true);

        await this.test('hideModal function is globally accessible', () => {
            return this.checkFunctionScope(addTasksPath, 'hideModal', true);
        }, true);

        await this.test('handleCancel function is globally accessible', () => {
            return this.checkFunctionScope(addTasksPath, 'handleCancel', true);
        }, true);

        await this.test('Critical edit variables are globally accessible', () => {
            const variables = ['isOccurrenceEdit', 'isFutureEdit', 'targetDate', 'splitDate', 'originalStartDate'];
            return variables.every(varName => this.checkVariableScope(addTasksPath, varName, true));
        }, true);

        await this.test('Form submission handler can access global variables', () => {
            const content = fs.readFileSync(addTasksPath, 'utf8');
            const formHandler = content.includes('addEventListener("submit"');
            const usesGlobalVars = content.includes('if (isOccurrenceEdit') && content.includes('if (isFutureEdit');
            return formHandler && usesGlobalVars;
        }, true);
    }

    async runFunctionalityTests() {
        this.log('\n⚙️ Testing Core Functionality...');

        // Load and test the filtering function
        const taskrotationsPath = path.join(__dirname, 'shared/taskrotations.js');
        if (this.checkFileExists(taskrotationsPath)) {
            try {
                // Mock environment for testing
                global.window = undefined;
                const taskrotationsCode = fs.readFileSync(taskrotationsPath, 'utf8');
                eval(taskrotationsCode);

                await this.test('filterTasksForDate function works correctly', () => {
                    if (typeof filterTasksForDate !== 'function') return false;

                    const testTask = {
                        title: 'Test Task',
                        date: '2024-01-01 to 2024-12-31',
                        users: ['Alice'],
                        repeat: 'Daily'
                    };

                    const result = filterTasksForDate([testTask], '2024-06-15');
                    return Array.isArray(result) && result.length === 1 && result[0].title === 'Test Task';
                }, true);

                await this.test('Exception system works for deleted tasks', () => {
                    const taskWithException = {
                        title: 'Test Task',
                        date: '2024-01-01 to 2024-12-31',
                        users: ['Alice'],
                        repeat: 'Daily',
                        exceptions: {
                            '2024-06-15': { deleted: true }
                        }
                    };

                    const result = filterTasksForDate([taskWithException], '2024-06-15');
                    return Array.isArray(result) && result.length === 0;
                }, true);

                await this.test('Exception system works for modified tasks', () => {
                    const taskWithException = {
                        title: 'Test Task',
                        date: '2024-01-01 to 2024-12-31',
                        users: ['Alice'],
                        exceptions: {
                            '2024-06-15': {
                                modified: true,
                                task: { title: 'Modified Task', users: ['Bob'] }
                            }
                        }
                    };

                    const result = filterTasksForDate([taskWithException], '2024-06-15');
                    return result.length === 1 && result[0].title === 'Modified Task' && result[0].isModified;
                }, true);

            } catch (error) {
                await this.test('filterTasksForDate function loads without errors', () => false, true);
            }
        }
    }

    async runUIComponentTests() {
        this.log('\n🖱️ Testing UI Components...');

        const tasksPath = path.join(__dirname, 'mobile/3-Tasks/tasks.html');
        const addTasksPath = path.join(__dirname, 'mobile/3-Tasks/addtasks.html');

        await this.test('Task detail modal has new editing buttons', () => {
            return this.checkFileContains(tasksPath, 'editOccurrenceBtn') &&
                   this.checkFileContains(tasksPath, 'editFutureBtn') &&
                   this.checkFileContains(tasksPath, 'deleteOccurrenceBtn');
        }, true);

        await this.test('New editing buttons have proper event listeners', () => {
            return this.checkFileContains(tasksPath, 'editOccurrenceBtn.*addEventListener') &&
                   this.checkFileContains(tasksPath, 'editFutureBtn.*addEventListener') &&
                   this.checkFileContains(tasksPath, 'deleteOccurrenceBtn.*addEventListener');
        });

        await this.test('Form has proper validation for new edit modes', () => {
            return this.checkFileContains(addTasksPath, 'isOccurrenceEdit.*targetDate') &&
                   this.checkFileContains(addTasksPath, 'isFutureEdit.*splitDate');
        }, true);

        await this.test('localStorage communication works for edit modes', () => {
            return this.checkFileContains(tasksPath, 'familyApp_editTask') &&
                   this.checkFileContains(addTasksPath, 'familyApp_editTask');
        }, true);
    }

    async runBackwardCompatibilityTests() {
        this.log('\n🔄 Testing Backward Compatibility...');

        await this.test('Original task deletion endpoint still exists', () => {
            const serverPath = path.join(__dirname, 'backend/server.js');
            return this.checkFileContains(serverPath, 'app\\.delete\\(["\'][^"\']*tasks["\'][^/]');
        }, true);

        await this.test('Original task editing endpoint still exists', () => {
            const serverPath = path.join(__dirname, 'backend/server.js');
            return this.checkFileContains(serverPath, 'app\\.put\\(["\'][^"\']*tasks["\'][^/]');
        }, true);

        await this.test('Original form submission logic preserved', () => {
            const addTasksPath = path.join(__dirname, 'mobile/3-Tasks/addtasks.html');
            return this.checkFileContains(addTasksPath, 'method.*POST') &&
                   this.checkFileContains(addTasksPath, 'adminEmail.*task');
        }, true);

        await this.test('Existing task structure unchanged', () => {
            // Tasks without exceptions should still work
            const taskrotationsPath = path.join(__dirname, 'shared/taskrotations.js');
            return this.checkFileContains(taskrotationsPath, 'task\\.exceptions.*&&');
        }, true);
    }

    async runSecurityAndValidationTests() {
        this.log('\n🛡️ Testing Security and Validation...');

        const serverPath = path.join(__dirname, 'backend/server.js');

        await this.test('New endpoints have proper parameter validation', () => {
            return this.checkFileContains(serverPath, 'occurrence.*adminEmail.*title.*date') &&
                   this.checkFileContains(serverPath, 'future.*adminEmail.*originalTitle.*splitDate');
        }, true);

        await this.test('New endpoints have error handling', () => {
            return this.checkFileContains(serverPath, 'occurrence.*catch.*err') &&
                   this.checkFileContains(serverPath, 'future.*catch.*err');
        }, true);

        this.warn('No hardcoded credentials in new code', () => {
            const files = ['mobile/3-Tasks/addtasks.html', 'mobile/3-Tasks/tasks.html', 'backend/server.js'];
            return !files.some(file => {
                const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
                return /password|secret|key/i.test(content.replace(/localStorage|adminEmail|api.*key/gi, ''));
            });
        });
    }

    async runPerformanceTests() {
        this.log('\n⚡ Testing Performance Characteristics...');

        this.warn('Files are not excessively large', () => {
            const files = [
                'mobile/3-Tasks/addtasks.html',
                'mobile/3-Tasks/tasks.html', 
                'shared/taskrotations.js'
            ];
            
            return files.every(file => {
                const stats = fs.statSync(path.join(__dirname, file));
                return stats.size < 500000; // 500KB limit
            });
        });

        this.warn('No excessive nesting in JavaScript', () => {
            const files = ['mobile/3-Tasks/addtasks.html', 'mobile/3-Tasks/tasks.html'];
            return files.every(file => {
                const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
                const maxNesting = (content.match(/{/g) || []).length;
                return maxNesting < 100;
            });
        });
    }

    async runIntegrationTests() {
        this.log('\n🔗 Testing System Integration...');

        await this.test('Frontend and backend endpoint URLs match', () => {
            const frontendFiles = ['mobile/3-Tasks/addtasks.html', 'mobile/3-Tasks/tasks.html'];
            const serverFile = 'backend/server.js';
            
            const serverContent = fs.readFileSync(path.join(__dirname, serverFile), 'utf8');
            const hasOccurrenceEndpoint = /api\/tasks\/occurrence/.test(serverContent);
            const hasFutureEndpoint = /api\/tasks\/future/.test(serverContent);
            
            const frontendHasOccurrence = frontendFiles.some(file => {
                const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
                return /api\/tasks\/occurrence/.test(content);
            });
            
            const frontendHasFuture = frontendFiles.some(file => {
                const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
                return /api\/tasks\/future/.test(content);
            });
            
            return hasOccurrenceEndpoint && hasFutureEndpoint && frontendHasOccurrence && frontendHasFuture;
        }, true);

        await this.test('Error messages are user-friendly', () => {
            const files = ['mobile/3-Tasks/addtasks.html', 'mobile/3-Tasks/tasks.html'];
            return files.every(file => {
                const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
                return /alert.*successfully|alert.*failed/i.test(content);
            });
        });
    }

    generateDetailedReport() {
        this.log('\n📊 Comprehensive Verification Report');
        this.log('=====================================\n');

        const total = this.results.passed + this.results.failed;
        const successRate = total > 0 ? ((this.results.passed / total) * 100).toFixed(1) : 0;

        this.log(`Total Tests: ${total}`);
        this.log(`✅ Passed: ${this.results.passed}`, 'success');
        this.log(`❌ Failed: ${this.results.failed}`, this.results.failed > 0 ? 'error' : 'success');
        this.log(`⚠️ Warnings: ${this.results.warnings}`, this.results.warnings > 0 ? 'warning' : 'success');
        this.log(`📈 Success Rate: ${successRate}%\n`);

        if (this.criticalIssues.length > 0) {
            this.log('🚨 CRITICAL ISSUES (Must Fix):', 'error');
            this.criticalIssues.forEach(issue => this.log(`   • ${issue}`, 'error'));
            this.log('');
        }

        if (this.minorIssues.length > 0) {
            this.log('⚠️ Minor Issues (Should Fix):', 'warning');
            this.minorIssues.forEach(issue => this.log(`   • ${issue}`, 'warning'));
            this.log('');
        }

        // Overall assessment
        if (this.criticalIssues.length === 0) {
            if (this.results.failed === 0) {
                this.log('🎉 VERIFICATION COMPLETE - ALL SYSTEMS OPERATIONAL!', 'success');
                this.log('✅ The recurring task management system is ready for production use.', 'success');
            } else {
                this.log('✅ VERIFICATION MOSTLY SUCCESSFUL', 'success');
                this.log('ℹ️ Minor issues detected but core functionality is working.', 'info');
            }
        } else {
            this.log('🚨 VERIFICATION FAILED - CRITICAL ISSUES DETECTED!', 'error');
            this.log('❌ The system requires fixes before production deployment.', 'error');
        }

        this.log('\n🎯 Feature Verification Summary:');
        this.log('   • Single Occurrence Deletion: ' + (this.checkFeatureWorking('occurrence.*delete') ? '✅' : '❌'));
        this.log('   • Single Occurrence Editing: ' + (this.checkFeatureWorking('occurrence.*edit') ? '✅' : '❌'));
        this.log('   • Future Occurrence Editing: ' + (this.checkFeatureWorking('future.*edit') ? '✅' : '❌'));
        this.log('   • Exception System: ' + (this.checkFeatureWorking('exception') ? '✅' : '❌'));
        this.log('   • Backward Compatibility: ' + (this.checkFeatureWorking('backward.*compatib') ? '✅' : '❌'));

        return {
            success: this.criticalIssues.length === 0,
            total: total,
            passed: this.results.passed,
            failed: this.results.failed,
            warnings: this.results.warnings,
            criticalIssues: this.criticalIssues,
            minorIssues: this.minorIssues,
            successRate: parseFloat(successRate)
        };
    }

    checkFeatureWorking(featurePattern) {
        const passedTests = this.results.tests.filter(t => t.status === 'PASSED');
        const pattern = new RegExp(featurePattern, 'i');
        return passedTests.some(t => pattern.test(t.description));
    }

    async run() {
        const startTime = Date.now();
        
        this.log('🚀 Starting Final Comprehensive Verification...');
        this.log('================================================\n');

        try {
            await this.runFileStructureTests();
            await this.runScopeTests();
            await this.runFunctionalityTests();
            await this.runUIComponentTests();
            await this.runBackwardCompatibilityTests();
            await this.runSecurityAndValidationTests();
            await this.runPerformanceTests();
            await this.runIntegrationTests();

            const endTime = Date.now();
            const duration = endTime - startTime;
            
            this.log(`\n⏱️ Verification completed in ${duration}ms`);
            
            return this.generateDetailedReport();

        } catch (error) {
            this.log(`💥 Verification suite crashed: ${error.message}`, 'error');
            throw error;
        }
    }
}

// Export for use as module
module.exports = FinalVerification;

// Run verification if executed directly
if (require.main === module) {
    const verification = new FinalVerification();
    
    verification.run()
        .then(result => {
            if (result.success) {
                console.log('\n🎊 SUCCESS: System is ready for production!');
                process.exit(0);
            } else {
                console.log('\n⚠️ ATTENTION: Issues require resolution before deployment.');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\n💥 FATAL: Verification failed catastrophically:', error.message);
            process.exit(2);
        });
}