// Integration test for the complete recurring task management workflow
// This test simulates real user interactions and data flow

const http = require('http');
const https = require('https');
const url = require('url');

// Mock DOM elements and localStorage for testing
global.localStorage = {
    data: {},
    getItem(key) { return this.data[key] || null; },
    setItem(key, value) { this.data[key] = value; },
    removeItem(key) { delete this.data[key]; },
    clear() { this.data = {}; }
};

global.document = {
    querySelector: () => ({ dataset: { date: '2024-03-15' } }),
    getElementById: () => ({ value: '', checked: false }),
    createElement: () => ({}),
    body: { appendChild: () => {} }
};

global.window = {
    location: { href: '' }
};

global.alert = console.log;
global.confirm = () => true;

// Import the filtering function
const fs = require('fs');
const path = require('path');

// Load and evaluate taskrotations.js
const taskrotationsPath = path.join(__dirname, 'shared', 'taskrotations.js');
const taskrotationsCode = fs.readFileSync(taskrotationsPath, 'utf8');
eval(taskrotationsCode);

class IntegrationTest {
    constructor() {
        this.baseUrl = 'https://beemazing1.onrender.com';
        this.testAdmin = 'test-admin@example.com';
        this.testData = {
            originalTask: {
                title: 'Daily Room Cleanup',
                date: '2024-01-01 to 2024-12-31',
                repeat: 'Daily',
                users: ['Alice', 'Bob'],
                reward: '5',
                settings: 'Rotation'
            }
        };
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    async test(description, testFn) {
        try {
            this.log(`Testing: ${description}`);
            const result = await testFn();
            if (result) {
                this.log(`PASSED: ${description}`, 'success');
                this.results.passed++;
                this.results.tests.push({ description, status: 'PASSED' });
            } else {
                this.log(`FAILED: ${description}`, 'error');
                this.results.failed++;
                this.results.tests.push({ description, status: 'FAILED' });
            }
        } catch (error) {
            this.log(`ERROR in ${description}: ${error.message}`, 'error');
            this.results.failed++;
            this.results.tests.push({ description, status: 'ERROR', error: error.message });
        }
    }

    async makeRequest(endpoint, options = {}) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(this.baseUrl + endpoint);
            const isHttps = urlObj.protocol === 'https:';
            const lib = isHttps ? https : http;
            
            const requestOptions = {
                hostname: urlObj.hostname,
                port: urlObj.port || (isHttps ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: options.method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            };

            const req = lib.request(requestOptions, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve({ status: res.statusCode, data: parsed });
                    } catch (e) {
                        resolve({ status: res.statusCode, data: data });
                    }
                });
            });

            req.on('error', reject);
            
            if (options.body) {
                req.write(JSON.stringify(options.body));
            }
            
            req.end();
        });
    }

    async runWorkflowTests() {
        this.log('🚀 Starting Integration Test Suite');
        this.log('==================================\n');

        // Test 1: Create original recurring task
        await this.test('Create original recurring task', async () => {
            const response = await this.makeRequest('/api/tasks', {
                method: 'POST',
                body: {
                    adminEmail: this.testAdmin,
                    task: this.testData.originalTask
                }
            });
            return response.status === 200 && response.data.success;
        });

        // Test 2: Verify task appears in list
        await this.test('Fetch tasks and verify original task exists', async () => {
            const response = await this.makeRequest(`/api/tasks?adminEmail=${encodeURIComponent(this.testAdmin)}`);
            if (response.status !== 200) return false;
            
            const tasks = response.data.tasks || [];
            const foundTask = tasks.find(t => t.title === this.testData.originalTask.title);
            return foundTask !== undefined;
        });

        // Test 3: Test task filtering without exceptions
        await this.test('Filter tasks for normal date', async () => {
            const response = await this.makeRequest(`/api/tasks?adminEmail=${encodeURIComponent(this.testAdmin)}`);
            if (response.status !== 200) return false;
            
            const tasks = response.data.tasks || [];
            const filteredTasks = filterTasksForDate(tasks, '2024-03-15');
            return filteredTasks.some(t => t.title === this.testData.originalTask.title);
        });

        // Test 4: Delete single occurrence
        await this.test('Delete single occurrence (March 15)', async () => {
            const response = await this.makeRequest(
                `/api/tasks/occurrence?adminEmail=${encodeURIComponent(this.testAdmin)}&title=${encodeURIComponent(this.testData.originalTask.title)}&date=2024-03-15&originalStartDate=2024-01-01`,
                { method: 'DELETE' }
            );
            return response.status === 200 && response.data.success;
        });

        // Test 5: Verify deletion exception works
        await this.test('Verify task hidden on deletion date', async () => {
            const response = await this.makeRequest(`/api/tasks?adminEmail=${encodeURIComponent(this.testAdmin)}`);
            if (response.status !== 200) return false;
            
            const tasks = response.data.tasks || [];
            const filteredTasks = filterTasksForDate(tasks, '2024-03-15');
            return !filteredTasks.some(t => t.title === this.testData.originalTask.title);
        });

        // Test 6: Verify task still appears on other dates
        await this.test('Verify task appears on other dates after deletion', async () => {
            const response = await this.makeRequest(`/api/tasks?adminEmail=${encodeURIComponent(this.testAdmin)}`);
            if (response.status !== 200) return false;
            
            const tasks = response.data.tasks || [];
            const filteredTasks = filterTasksForDate(tasks, '2024-03-16');
            return filteredTasks.some(t => t.title === this.testData.originalTask.title);
        });

        // Test 7: Edit single occurrence
        await this.test('Edit single occurrence (March 20)', async () => {
            const modifiedTask = {
                title: 'Special Event Cleanup',
                date: '2024-03-20 to 2024-03-20',
                repeat: 'Daily',
                users: ['Charlie'],
                reward: '10',
                settings: 'Individual'
            };

            const response = await this.makeRequest('/api/tasks/occurrence', {
                method: 'PUT',
                body: {
                    adminEmail: this.testAdmin,
                    originalTitle: this.testData.originalTask.title,
                    originalStartDate: '2024-01-01',
                    targetDate: '2024-03-20',
                    modifiedTask: modifiedTask
                }
            });
            return response.status === 200 && response.data.success;
        });

        // Test 8: Verify modification exception works
        await this.test('Verify task modified on modification date', async () => {
            const response = await this.makeRequest(`/api/tasks?adminEmail=${encodeURIComponent(this.testAdmin)}`);
            if (response.status !== 200) return false;
            
            const tasks = response.data.tasks || [];
            const filteredTasks = filterTasksForDate(tasks, '2024-03-20');
            const modifiedTask = filteredTasks.find(t => t.isModified && t.title === 'Special Event Cleanup');
            return modifiedTask !== undefined && modifiedTask.users.includes('Charlie');
        });

        // Test 9: Test future occurrence editing (task splitting)
        await this.test('Split task for future editing (April 1)', async () => {
            const modifiedTask = {
                title: 'Daily Room Cleanup with Bonus',
                date: '2024-04-01 to 2024-12-31',
                repeat: 'Daily',
                users: ['Alice', 'Bob', 'Dave'],
                reward: '7',
                settings: 'Rotation'
            };

            const response = await this.makeRequest('/api/tasks/future', {
                method: 'PUT',
                body: {
                    adminEmail: this.testAdmin,
                    originalTitle: this.testData.originalTask.title,
                    originalStartDate: '2024-01-01',
                    splitDate: '2024-04-01',
                    modifiedTask: modifiedTask
                }
            });
            return response.status === 200 && response.data.success;
        });

        // Test 10: Verify task splitting worked
        await this.test('Verify task split correctly', async () => {
            const response = await this.makeRequest(`/api/tasks?adminEmail=${encodeURIComponent(this.testAdmin)}`);
            if (response.status !== 200) return false;
            
            const tasks = response.data.tasks || [];
            
            // Check original task ends on March 31
            const originalTask = tasks.find(t => t.title === this.testData.originalTask.title);
            const originalEndsCorrectly = originalTask && originalTask.date.includes('2024-03-31');
            
            // Check new task starts on April 1
            const newTask = tasks.find(t => t.title === 'Daily Room Cleanup with Bonus');
            const newStartsCorrectly = newTask && newTask.date.startsWith('2024-04-01');
            
            return originalEndsCorrectly && newStartsCorrectly;
        });

        // Test 11: Verify filtering works with split tasks
        await this.test('Verify filtering works correctly after split', async () => {
            const response = await this.makeRequest(`/api/tasks?adminEmail=${encodeURIComponent(this.testAdmin)}`);
            if (response.status !== 200) return false;
            
            const tasks = response.data.tasks || [];
            
            // March task should be original
            const marchTasks = filterTasksForDate(tasks, '2024-03-30');
            const marchTask = marchTasks.find(t => t.title === this.testData.originalTask.title);
            
            // April task should be new
            const aprilTasks = filterTasksForDate(tasks, '2024-04-02');
            const aprilTask = aprilTasks.find(t => t.title === 'Daily Room Cleanup with Bonus');
            
            return marchTask && aprilTask && marchTask.reward === '5' && aprilTask.reward === '7';
        });

        // Test 12: Test data integrity
        await this.test('Verify all exceptions are properly stored', async () => {
            const response = await this.makeRequest(`/api/tasks?adminEmail=${encodeURIComponent(this.testAdmin)}`);
            if (response.status !== 200) return false;
            
            const tasks = response.data.tasks || [];
            const originalTask = tasks.find(t => t.title === this.testData.originalTask.title);
            
            if (!originalTask || !originalTask.exceptions) return false;
            
            const hasDeletionException = originalTask.exceptions['2024-03-15']?.deleted === true;
            const hasModificationException = originalTask.exceptions['2024-03-20']?.modified === true;
            
            return hasDeletionException && hasModificationException;
        });

        // Test 13: Test edge cases
        await this.test('Test filtering with multiple exceptions on same task', async () => {
            const response = await this.makeRequest(`/api/tasks?adminEmail=${encodeURIComponent(this.testAdmin)}`);
            if (response.status !== 200) return false;
            
            const tasks = response.data.tasks || [];
            
            // Test deletion exception
            const deletionDate = filterTasksForDate(tasks, '2024-03-15');
            const deletionHidden = !deletionDate.some(t => t.title === this.testData.originalTask.title);
            
            // Test modification exception  
            const modificationDate = filterTasksForDate(tasks, '2024-03-20');
            const modificationWorking = modificationDate.some(t => t.isModified && t.title === 'Special Event Cleanup');
            
            // Test normal date
            const normalDate = filterTasksForDate(tasks, '2024-03-12');
            const normalWorking = normalDate.some(t => t.title === this.testData.originalTask.title && !t.isModified);
            
            return deletionHidden && modificationWorking && normalWorking;
        });

        // Test 14: Performance test with exceptions
        await this.test('Performance test with multiple exceptions', async () => {
            const start = Date.now();
            
            const response = await this.makeRequest(`/api/tasks?adminEmail=${encodeURIComponent(this.testAdmin)}`);
            if (response.status !== 200) return false;
            
            const tasks = response.data.tasks || [];
            
            // Filter multiple dates
            const dates = ['2024-03-15', '2024-03-20', '2024-03-25', '2024-04-01', '2024-04-02'];
            for (const date of dates) {
                filterTasksForDate(tasks, date);
            }
            
            const end = Date.now();
            const duration = end - start;
            
            this.log(`Performance: Filtered ${dates.length} dates in ${duration}ms`);
            return duration < 1000; // Should complete in under 1 second
        });

        // Test 15: Cleanup test
        await this.test('Cleanup test data', async () => {
            // Delete all test tasks
            const response = await this.makeRequest(`/api/tasks?adminEmail=${encodeURIComponent(this.testAdmin)}`);
            if (response.status !== 200) return false;
            
            const tasks = response.data.tasks || [];
            let cleanupSuccess = true;
            
            for (const task of tasks) {
                if (task.title.includes('Cleanup')) {
                    const deleteResponse = await this.makeRequest(
                        `/api/tasks?adminEmail=${encodeURIComponent(this.testAdmin)}&title=${encodeURIComponent(task.title)}&date=${encodeURIComponent(task.date.split(' to ')[0])}`,
                        { method: 'DELETE' }
                    );
                    if (deleteResponse.status !== 200) {
                        cleanupSuccess = false;
                    }
                }
            }
            
            return cleanupSuccess;
        });

        this.printResults();
    }

    async runErrorHandlingTests() {
        this.log('\n🛡️ Starting Error Handling Tests');
        this.log('==================================\n');

        // Test invalid requests
        await this.test('Handle missing parameters in delete occurrence', async () => {
            const response = await this.makeRequest('/api/tasks/occurrence?adminEmail=test', {
                method: 'DELETE'
            });
            return response.status === 400;
        });

        await this.test('Handle invalid task ID in occurrence edit', async () => {
            const response = await this.makeRequest('/api/tasks/occurrence', {
                method: 'PUT',
                body: {
                    adminEmail: this.testAdmin,
                    originalTitle: 'Nonexistent Task',
                    originalStartDate: '2024-01-01',
                    targetDate: '2024-03-15',
                    modifiedTask: { title: 'Test' }
                }
            });
            return response.status === 404;
        });

        await this.test('Handle malformed date in split task', async () => {
            const response = await this.makeRequest('/api/tasks/future', {
                method: 'PUT',
                body: {
                    adminEmail: this.testAdmin,
                    originalTitle: 'Test Task',
                    originalStartDate: '2024-01-01',
                    splitDate: 'invalid-date',
                    modifiedTask: { title: 'Test' }
                }
            });
            return response.status >= 400;
        });
    }

    printResults() {
        this.log('\n📊 Integration Test Results');
        this.log('===========================\n');
        
        this.log(`Total Tests: ${this.results.passed + this.results.failed}`);
        this.log(`Passed: ${this.results.passed}`, 'success');
        this.log(`Failed: ${this.results.failed}`, this.results.failed > 0 ? 'error' : 'success');
        this.log(`Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%\n`);

        if (this.results.failed > 0) {
            this.log('Failed Tests:', 'error');
            this.results.tests
                .filter(t => t.status !== 'PASSED')
                .forEach(t => this.log(`  - ${t.description} (${t.status})${t.error ? ': ' + t.error : ''}`, 'error'));
        }

        if (this.results.failed === 0) {
            this.log('🎉 All integration tests passed! The recurring task system is working correctly.', 'success');
        } else {
            this.log('⚠️  Some integration tests failed. Please review the implementation.', 'error');
        }
    }

    async run() {
        const startTime = Date.now();
        
        try {
            await this.runWorkflowTests();
            await this.runErrorHandlingTests();
        } catch (error) {
            this.log(`Integration test suite failed: ${error.message}`, 'error');
        }
        
        const endTime = Date.now();
        this.log(`\n⏱️  Total execution time: ${endTime - startTime}ms`);
        
        return {
            success: this.results.failed === 0,
            results: this.results,
            duration: endTime - startTime
        };
    }
}

// Run the tests if this file is executed directly
if (require.main === module) {
    const test = new IntegrationTest();
    test.run().then(results => {
        process.exit(results.success ? 0 : 1);
    }).catch(error => {
        console.error('Integration test suite crashed:', error);
        process.exit(1);
    });
}

module.exports = IntegrationTest;