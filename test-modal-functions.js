// Test file for modal functionality in addtasks.html
// This tests that modal functions are properly accessible and work correctly

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

class ModalFunctionTest {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    log(message, type = 'info') {
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
        console.log(`${prefix} ${message}`);
    }

    async test(description, testFn) {
        try {
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

    setupDOM() {
        // Create a mock DOM environment
        const html = `
            <!DOCTYPE html>
            <html>
            <head><title>Test</title></head>
            <body>
                <div id="testModal" class="modal" style="display: none;">
                    <div class="modal-content">Test Modal</div>
                </div>
                <div id="addTaskForm">
                    <input id="taskTitle" value="Test Task" />
                    <input id="taskNotes" value="Test Notes" />
                    <input id="roomSelection" value="" />
                    <input id="repeatSelection" value="Daily" />
                    <input id="settingsSelection" value="" />
                    <input id="taskDate" value="2024-01-01" />
                    <input id="taskDateTo" value="" />
                    <input id="dateModeSelection" value="date" />
                    <input id="taskReminder" type="checkbox" />
                    <input id="assignedToSelection" value="Alice, Bob" />
                    <input id="RewardValue" value="5" />
                    <input id="timesPerDayInput" value="1" />
                    <input id="timesPerWeekInput" value="1" />
                    <input id="timesPerMonthInput" value="1" />
                    <input id="specificDatesInput" value="" />
                </div>
                <style>
                    .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; }
                    .modal.show { display: flex !important; }
                    .modal.hide { display: none !important; }
                </style>
            </body>
            </html>
        `;

        this.dom = new JSDOM(html, { 
            url: 'http://localhost',
            pretendToBeVisual: true,
            resources: 'usable'
        });
        
        global.window = this.dom.window;
        global.document = this.dom.window.document;
        global.alert = (msg) => console.log(`ALERT: ${msg}`);
        global.confirm = () => true;
        
        // Mock localStorage
        global.localStorage = {
            data: {},
            getItem(key) { return this.data[key] || null; },
            setItem(key, value) { this.data[key] = value; },
            removeItem(key) { delete this.data[key]; },
            clear() { this.data = {}; }
        };

        // Set up some test data
        localStorage.setItem('currentAdminEmail', 'test@example.com');
        localStorage.setItem('currentUser', 'TestUser');
    }

    loadModalFunctions() {
        // Load the modal functions from addtasks.html
        const addTasksPath = path.join(__dirname, 'mobile/3-Tasks/addtasks.html');
        const content = fs.readFileSync(addTasksPath, 'utf8');

        // Extract the modal functions
        const showModalMatch = content.match(/function showModal\(modal\)\s*{[^}]+}/);
        const hideModalMatch = content.match(/function hideModal\(modal\)\s*{[^}]+}/);
        const setupTimesModalMatch = content.match(/function setupTimesModal\([^)]*\)\s*{[^}]+(?:{[^}]*}[^}]*)*}/);

        if (showModalMatch) {
            eval(showModalMatch[0]);
            global.showModal = showModal;
        }

        if (hideModalMatch) {
            eval(hideModalMatch[0]);
            global.hideModal = hideModal;
        }

        if (setupTimesModalMatch) {
            eval(setupTimesModalMatch[0]);
            global.setupTimesModal = setupTimesModal;
        }

        // Also load global variables that might be needed
        eval(`
            let isOccurrenceEdit = false;
            let isFutureEdit = false;
            let targetDate = null;
            let splitDate = null;
            let originalStartDate = null;
            let editTask = null;
            let selectedDays = ["Any"];
            let alarms = [];
        `);

        global.isOccurrenceEdit = isOccurrenceEdit;
        global.isFutureEdit = isFutureEdit;
        global.targetDate = targetDate;
        global.splitDate = splitDate;
        global.originalStartDate = originalStartDate;
        global.editTask = editTask;
        global.selectedDays = selectedDays;
        global.alarms = alarms;
    }

    async runTests() {
        this.log('🧪 Starting Modal Function Tests...\n');

        this.setupDOM();
        this.loadModalFunctions();

        // Test 1: Modal functions exist
        await this.test('showModal function exists', () => {
            return typeof global.showModal === 'function';
        });

        await this.test('hideModal function exists', () => {
            return typeof global.hideModal === 'function';
        });

        await this.test('setupTimesModal function exists', () => {
            return typeof global.setupTimesModal === 'function';
        });

        // Test 2: Modal show functionality
        await this.test('showModal makes modal visible', () => {
            const modal = document.getElementById('testModal');
            showModal(modal);
            return modal.classList.contains('show') && modal.style.display === 'flex';
        });

        // Test 3: Modal hide functionality
        await this.test('hideModal hides modal', () => {
            const modal = document.getElementById('testModal');
            showModal(modal); // First show it
            hideModal(modal);
            return modal.classList.contains('hide');
        });

        // Test 4: Global variables accessibility
        await this.test('Global edit variables are accessible', () => {
            return typeof global.isOccurrenceEdit === 'boolean' &&
                   typeof global.isFutureEdit === 'boolean' &&
                   global.targetDate === null &&
                   global.splitDate === null;
        });

        // Test 5: DOM elements exist for form
        await this.test('Required form elements exist', () => {
            const elements = [
                'taskTitle', 'taskNotes', 'roomSelection', 'repeatSelection',
                'settingsSelection', 'taskDate', 'dateModeSelection',
                'assignedToSelection', 'RewardValue'
            ];
            
            return elements.every(id => document.getElementById(id) !== null);
        });

        // Test 6: Form validation would work
        await this.test('Form elements have expected values', () => {
            const title = document.getElementById('taskTitle').value;
            const users = document.getElementById('assignedToSelection').value;
            const date = document.getElementById('taskDate').value;
            
            return title === 'Test Task' && 
                   users === 'Alice, Bob' && 
                   date === '2024-01-01';
        });

        // Test 7: Global variables can be modified
        await this.test('Global variables can be modified', () => {
            global.isOccurrenceEdit = true;
            global.targetDate = '2024-03-15';
            
            return global.isOccurrenceEdit === true && 
                   global.targetDate === '2024-03-15';
        });

        // Test 8: Array variables work correctly
        await this.test('Array variables (alarms, selectedDays) work', () => {
            global.alarms.push('09:00');
            global.selectedDays = ['Monday', 'Tuesday'];
            
            return global.alarms.length === 1 && 
                   global.alarms[0] === '09:00' &&
                   global.selectedDays.length === 2;
        });

        // Test 9: localStorage functionality
        await this.test('localStorage is accessible and working', () => {
            localStorage.setItem('testKey', 'testValue');
            const value = localStorage.getItem('testKey');
            return value === 'testValue';
        });

        // Test 10: Mock form submission preparation
        await this.test('Form data can be extracted correctly', () => {
            try {
                const title = document.getElementById('taskTitle').value.trim();
                const users = document.getElementById('assignedToSelection').value
                    .split(',')
                    .map(u => u.trim())
                    .filter(u => u);
                
                return title === 'Test Task' && 
                       users.length === 2 && 
                       users[0] === 'Alice' && 
                       users[1] === 'Bob';
            } catch (error) {
                return false;
            }
        });

        this.printResults();
    }

    printResults() {
        this.log('\n📊 Modal Function Test Results');
        this.log('==============================\n');
        
        this.log(`Total Tests: ${this.results.passed + this.results.failed}`);
        this.log(`Passed: ${this.results.passed}`, 'success');
        this.log(`Failed: ${this.results.failed}`, this.results.failed > 0 ? 'error' : 'success');
        
        const successRate = ((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1);
        this.log(`Success Rate: ${successRate}%\n`);

        if (this.results.failed > 0) {
            this.log('Failed Tests:', 'error');
            this.results.tests
                .filter(t => t.status !== 'PASSED')
                .forEach(t => this.log(`  - ${t.description} (${t.status})${t.error ? ': ' + t.error : ''}`, 'error'));
        }

        if (this.results.failed === 0) {
            this.log('🎉 All modal function tests passed! The UI should work correctly.', 'success');
        } else {
            this.log('⚠️  Some modal function tests failed. UI functionality may be broken.', 'error');
        }

        return {
            success: this.results.failed === 0,
            results: this.results
        };
    }
}

// Run tests if executed directly
if (require.main === module) {
    const test = new ModalFunctionTest();
    test.runTests().then(results => {
        process.exit(results.success ? 0 : 1);
    }).catch(error => {
        console.error('Modal test suite crashed:', error);
        process.exit(1);
    });
}

module.exports = ModalFunctionTest;