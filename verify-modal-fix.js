// Verification script for modal functionality fixes
// This script tests the modal functionality in userAdmin.html

console.log('🧪 Starting Modal Functionality Verification...\n');

// Test 1: Check if modal elements exist
function testModalElements() {
    console.log('📋 Test 1: Checking Modal Elements');
    
    const requiredModals = [
        'addUserModal',
        'permissionModal', 
        'confirmModal'
    ];
    
    const requiredButtons = [
        'addUserBtn',
        'submitUserBtn',
        'cancelUserBtn',
        'savePermissionBtn',
        'cancelEditBtn',
        'confirmYesBtn',
        'confirmNoBtn'
    ];
    
    const requiredInputs = [
        'usernameInput',
        'editUserNameInput',
        'errorMessage',
        'editErrorMessage'
    ];
    
    let passed = 0;
    let total = requiredModals.length + requiredButtons.length + requiredInputs.length;
    
    // Check modals
    requiredModals.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            console.log(`  ✅ Modal found: ${id}`);
            passed++;
        } else {
            console.log(`  ❌ Modal missing: ${id}`);
        }
    });
    
    // Check buttons
    requiredButtons.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            console.log(`  ✅ Button found: ${id}`);
            passed++;
        } else {
            console.log(`  ❌ Button missing: ${id}`);
        }
    });
    
    // Check inputs
    requiredInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            console.log(`  ✅ Input found: ${id}`);
            passed++;
        } else {
            console.log(`  ❌ Input missing: ${id}`);
        }
    });
    
    console.log(`\n📊 Elements Test Result: ${passed}/${total} passed\n`);
    return passed === total;
}

// Test 2: Check CSS classes and styles
function testModalStyles() {
    console.log('🎨 Test 2: Checking Modal CSS');
    
    const addModal = document.getElementById('addUserModal');
    const editModal = document.getElementById('permissionModal');
    const deleteModal = document.getElementById('confirmModal');
    
    let passed = 0;
    let total = 6;
    
    // Test initial state (should be hidden)
    if (addModal && !addModal.classList.contains('show')) {
        console.log('  ✅ Add modal initially hidden');
        passed++;
    } else {
        console.log('  ❌ Add modal not properly hidden');
    }
    
    if (editModal && !editModal.classList.contains('show')) {
        console.log('  ✅ Edit modal initially hidden');
        passed++;
    } else {
        console.log('  ❌ Edit modal not properly hidden');
    }
    
    if (deleteModal && !deleteModal.classList.contains('show')) {
        console.log('  ✅ Delete modal initially hidden');
        passed++;
    } else {
        console.log('  ❌ Delete modal not properly hidden');
    }
    
    // Test show functionality
    if (addModal) {
        addModal.classList.add('show');
        const isVisible = window.getComputedStyle(addModal).display !== 'none';
        if (isVisible) {
            console.log('  ✅ Add modal shows when .show class added');
            passed++;
        } else {
            console.log('  ❌ Add modal does not show with .show class');
        }
        addModal.classList.remove('show');
    }
    
    if (editModal) {
        editModal.classList.add('show');
        const isVisible = window.getComputedStyle(editModal).display !== 'none';
        if (isVisible) {
            console.log('  ✅ Edit modal shows when .show class added');
            passed++;
        } else {
            console.log('  ❌ Edit modal does not show with .show class');
        }
        editModal.classList.remove('show');
    }
    
    if (deleteModal) {
        deleteModal.classList.add('show');
        const isVisible = window.getComputedStyle(deleteModal).display !== 'none';
        if (isVisible) {
            console.log('  ✅ Delete modal shows when .show class added');
            passed++;
        } else {
            console.log('  ❌ Delete modal does not show with .show class');
        }
        deleteModal.classList.remove('show');
    }
    
    console.log(`\n📊 Styles Test Result: ${passed}/${total} passed\n`);
    return passed === total;
}

// Test 3: Check button event handlers
function testButtonHandlers() {
    console.log('🔧 Test 3: Checking Button Event Handlers');
    
    let passed = 0;
    let total = 7;
    
    // Test add button
    const addBtn = document.getElementById('addUserBtn');
    if (addBtn) {
        const eventListeners = getEventListeners(addBtn);
        if (eventListeners && eventListeners.click && eventListeners.click.length > 0) {
            console.log('  ✅ Add button has click handler');
            passed++;
        } else {
            console.log('  ❌ Add button missing click handler');
        }
    }
    
    // Test submit buttons
    const submitBtn = document.getElementById('submitUserBtn');
    if (submitBtn) {
        const eventListeners = getEventListeners(submitBtn);
        if (eventListeners && eventListeners.click && eventListeners.click.length > 0) {
            console.log('  ✅ Submit button has click handler');
            passed++;
        } else {
            console.log('  ❌ Submit button missing click handler');
        }
    }
    
    // Test cancel buttons
    const cancelBtn = document.getElementById('cancelUserBtn');
    if (cancelBtn) {
        const eventListeners = getEventListeners(cancelBtn);
        if (eventListeners && eventListeners.click && eventListeners.click.length > 0) {
            console.log('  ✅ Cancel button has click handler');
            passed++;
        } else {
            console.log('  ❌ Cancel button missing click handler');
        }
    }
    
    // Test save button
    const saveBtn = document.getElementById('savePermissionBtn');
    if (saveBtn) {
        const eventListeners = getEventListeners(saveBtn);
        if (eventListeners && eventListeners.click && eventListeners.click.length > 0) {
            console.log('  ✅ Save button has click handler');
            passed++;
        } else {
            console.log('  ❌ Save button missing click handler');
        }
    }
    
    // Test cancel edit button
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    if (cancelEditBtn) {
        const eventListeners = getEventListeners(cancelEditBtn);
        if (eventListeners && eventListeners.click && eventListeners.click.length > 0) {
            console.log('  ✅ Cancel edit button has click handler');
            passed++;
        } else {
            console.log('  ❌ Cancel edit button missing click handler');
        }
    }
    
    // Test confirm buttons
    const confirmYesBtn = document.getElementById('confirmYesBtn');
    if (confirmYesBtn) {
        const eventListeners = getEventListeners(confirmYesBtn);
        if (eventListeners && eventListeners.click && eventListeners.click.length > 0) {
            console.log('  ✅ Confirm Yes button has click handler');
            passed++;
        } else {
            console.log('  ❌ Confirm Yes button missing click handler');
        }
    }
    
    const confirmNoBtn = document.getElementById('confirmNoBtn');
    if (confirmNoBtn) {
        const eventListeners = getEventListeners(confirmNoBtn);
        if (eventListeners && eventListeners.click && eventListeners.click.length > 0) {
            console.log('  ✅ Confirm No button has click handler');
            passed++;
        } else {
            console.log('  ❌ Confirm No button missing click handler');
        }
    }
    
    console.log(`\n📊 Handlers Test Result: ${passed}/${total} passed\n`);
    return passed === total;
}

// Test 4: Simulate modal interactions
function testModalInteractions() {
    console.log('⚡ Test 4: Testing Modal Interactions');
    
    let passed = 0;
    let total = 9;
    
    try {
        // Test Add Modal
        const addModal = document.getElementById('addUserModal');
        const addBtn = document.getElementById('addUserBtn');
        const cancelBtn = document.getElementById('cancelUserBtn');
        
        if (addBtn && addModal) {
            // Simulate click
            addBtn.click();
            if (addModal.classList.contains('show')) {
                console.log('  ✅ Add modal opens on button click');
                passed++;
            } else {
                console.log('  ❌ Add modal does not open on button click');
            }
            
            // Test cancel
            if (cancelBtn) {
                cancelBtn.click();
                if (!addModal.classList.contains('show')) {
                    console.log('  ✅ Add modal closes on cancel');
                    passed++;
                } else {
                    console.log('  ❌ Add modal does not close on cancel');
                }
            }
        }
        
        // Test Edit Modal functions
        if (typeof showPermissionModal === 'function') {
            console.log('  ✅ showPermissionModal function exists');
            passed++;
            
            try {
                showPermissionModal('Test User');
                const editModal = document.getElementById('permissionModal');
                if (editModal && editModal.classList.contains('show')) {
                    console.log('  ✅ showPermissionModal opens modal');
                    passed++;
                    editModal.classList.remove('show');
                } else {
                    console.log('  ❌ showPermissionModal does not open modal');
                }
            } catch (e) {
                console.log('  ❌ showPermissionModal throws error:', e.message);
            }
        } else {
            console.log('  ❌ showPermissionModal function missing');
        }
        
        // Test Delete Modal functions
        if (typeof showConfirmModal === 'function') {
            console.log('  ✅ showConfirmModal function exists');
            passed++;
            
            try {
                showConfirmModal('Test User');
                const deleteModal = document.getElementById('confirmModal');
                if (deleteModal && deleteModal.classList.contains('show')) {
                    console.log('  ✅ showConfirmModal opens modal');
                    passed++;
                    deleteModal.classList.remove('show');
                } else {
                    console.log('  ❌ showConfirmModal does not open modal');
                }
            } catch (e) {
                console.log('  ❌ showConfirmModal throws error:', e.message);
            }
        } else {
            console.log('  ❌ showConfirmModal function missing');
        }
        
        // Test helper functions
        if (typeof closeAddModal === 'function') {
            console.log('  ✅ closeAddModal function exists');
            passed++;
        } else {
            console.log('  ❌ closeAddModal function missing');
        }
        
        if (typeof closeEditModal === 'function') {
            console.log('  ✅ closeEditModal function exists');
            passed++;
        } else {
            console.log('  ❌ closeEditModal function missing');
        }
        
        if (typeof closeConfirmModal === 'function') {
            console.log('  ✅ closeConfirmModal function exists');
            passed++;
        } else {
            console.log('  ❌ closeConfirmModal function missing');
        }
        
    } catch (error) {
        console.log('  ❌ Error during interaction test:', error.message);
    }
    
    console.log(`\n📊 Interactions Test Result: ${passed}/${total} passed\n`);
    return passed === total;
}

// Helper function to get event listeners (might not work in all browsers)
function getEventListeners(element) {
    try {
        return window.getEventListeners ? window.getEventListeners(element) : null;
    } catch (e) {
        return null;
    }
}

// Main verification function
function runVerification() {
    console.log('🚀 Beginning Modal Verification Process...\n');
    
    const results = [];
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runVerification);
        return;
    }
    
    // Run all tests
    results.push({ test: 'Modal Elements', passed: testModalElements() });
    results.push({ test: 'Modal Styles', passed: testModalStyles() });
    results.push({ test: 'Button Handlers', passed: testButtonHandlers() });
    results.push({ test: 'Modal Interactions', passed: testModalInteractions() });
    
    // Summary
    const totalPassed = results.filter(r => r.passed).length;
    const totalTests = results.length;
    
    console.log('📋 VERIFICATION SUMMARY');
    console.log('========================');
    
    results.forEach(result => {
        const status = result.passed ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} - ${result.test}`);
    });
    
    console.log(`\n🎯 Overall Result: ${totalPassed}/${totalTests} tests passed`);
    
    if (totalPassed === totalTests) {
        console.log('🎉 ALL TESTS PASSED! Modal functionality is working correctly.');
    } else {
        console.log('⚠️  Some tests failed. Please check the issues above.');
    }
    
    // Additional instructions
    console.log('\n📖 To manually test:');
    console.log('1. Open userAdmin.html in a browser');
    console.log('2. Click the + button (should show add form)');
    console.log('3. Click gear ⚙️ icon next to a user (should show edit form)');
    console.log('4. Click X button next to a user (should show delete confirmation)');
    console.log('5. Each modal should display properly and buttons should work');
    
    return totalPassed === totalTests;
}

// Run verification when script loads
runVerification();

// Export for external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runVerification };
}