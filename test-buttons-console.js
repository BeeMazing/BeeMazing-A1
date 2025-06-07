// BeeMazing Button Test Script
// Run this in browser console after opening userAdmin.html

console.log('🧪 BeeMazing Button Test Script Starting...\n');

// Test 1: Check if all required elements exist
function testElementsExist() {
    console.log('📋 Test 1: Checking if elements exist');
    
    const elements = {
        'profileIcon': document.getElementById('profileIcon'),
        'addUserBtn': document.getElementById('addUserBtn'),
        'userSelectModal': document.getElementById('userSelectModal'),
        'addUserModal': document.getElementById('addUserModal'),
        'permissionModal': document.getElementById('permissionModal'),
        'confirmModal': document.getElementById('confirmModal'),
        'submitUserBtn': document.getElementById('submitUserBtn'),
        'cancelUserBtn': document.getElementById('cancelUserBtn'),
        'savePermissionBtn': document.getElementById('savePermissionBtn'),
        'cancelEditBtn': document.getElementById('cancelEditBtn'),
        'confirmYesBtn': document.getElementById('confirmYesBtn'),
        'confirmNoBtn': document.getElementById('confirmNoBtn'),
        'usernameInput': document.getElementById('usernameInput'),
        'editUserNameInput': document.getElementById('editUserNameInput')
    };
    
    let found = 0;
    let total = Object.keys(elements).length;
    
    for (const [name, element] of Object.entries(elements)) {
        if (element) {
            console.log(`  ✅ ${name}: Found`);
            found++;
        } else {
            console.log(`  ❌ ${name}: Missing`);
        }
    }
    
    console.log(`\n📊 Elements Result: ${found}/${total} found\n`);
    return found === total;
}

// Test 2: Check CSS classes for modals
function testModalCSS() {
    console.log('🎨 Test 2: Checking modal CSS');
    
    const modals = ['addUserModal', 'permissionModal', 'confirmModal'];
    let working = 0;
    
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            const initialDisplay = window.getComputedStyle(modal).display;
            
            // Test showing
            modal.classList.add('show');
            const showDisplay = window.getComputedStyle(modal).display;
            
            // Test hiding
            modal.classList.remove('show');
            const hideDisplay = window.getComputedStyle(modal).display;
            
            console.log(`  ${modalId}:`);
            console.log(`    Initial: ${initialDisplay}`);
            console.log(`    With .show: ${showDisplay}`);
            console.log(`    After remove: ${hideDisplay}`);
            
            if (showDisplay !== 'none' && hideDisplay === 'none') {
                console.log(`    ✅ CSS working correctly`);
                working++;
            } else {
                console.log(`    ❌ CSS not working`);
            }
        } else {
            console.log(`  ❌ ${modalId}: Not found`);
        }
    });
    
    console.log(`\n📊 CSS Result: ${working}/${modals.length} working\n`);
    return working === modals.length;
}

// Test 3: Check if functions exist
function testFunctionsExist() {
    console.log('🔧 Test 3: Checking if functions exist');
    
    const functions = {
        'setupUserManagement': typeof setupUserManagement,
        'showPermissionModal': typeof showPermissionModal,
        'showConfirmModal': typeof showConfirmModal,
        'closeAddModal': typeof closeAddModal,
        'closeEditModal': typeof closeEditModal,
        'closeConfirmModal': typeof closeConfirmModal
    };
    
    let found = 0;
    let total = Object.keys(functions).length;
    
    for (const [name, type] of Object.entries(functions)) {
        if (type === 'function') {
            console.log(`  ✅ ${name}: Function exists`);
            found++;
        } else {
            console.log(`  ❌ ${name}: ${type === 'undefined' ? 'Not found' : 'Wrong type: ' + type}`);
        }
    }
    
    console.log(`\n📊 Functions Result: ${found}/${total} found\n`);
    return found === total;
}

// Test 4: Simulate button clicks
function testButtonClicks() {
    console.log('⚡ Test 4: Testing button click simulation');
    
    let results = {
        profileIcon: false,
        addUser: false,
        edit: false,
        delete: false
    };
    
    // Test profile icon
    const profileIcon = document.getElementById('profileIcon');
    if (profileIcon) {
        try {
            console.log('  Testing profile icon click...');
            profileIcon.click();
            
            // Check if modal opened
            setTimeout(() => {
                const modal = document.getElementById('userSelectModal');
                if (modal && (modal.style.display !== 'none' || modal.classList.contains('show'))) {
                    console.log('  ✅ Profile icon click worked');
                    results.profileIcon = true;
                } else {
                    console.log('  ❌ Profile icon click failed');
                }
            }, 100);
            
        } catch (e) {
            console.log('  ❌ Profile icon click error:', e.message);
        }
    }
    
    // Test add user button
    const addBtn = document.getElementById('addUserBtn');
    if (addBtn) {
        try {
            console.log('  Testing add user button click...');
            addBtn.click();
            
            setTimeout(() => {
                const modal = document.getElementById('addUserModal');
                if (modal && modal.classList.contains('show')) {
                    console.log('  ✅ Add user button click worked');
                    results.addUser = true;
                    modal.classList.remove('show'); // Close it
                } else {
                    console.log('  ❌ Add user button click failed');
                }
            }, 100);
            
        } catch (e) {
            console.log('  ❌ Add user button click error:', e.message);
        }
    }
    
    // Test edit function
    if (typeof showPermissionModal === 'function') {
        try {
            console.log('  Testing showPermissionModal function...');
            showPermissionModal('Test User');
            
            setTimeout(() => {
                const modal = document.getElementById('permissionModal');
                if (modal && modal.classList.contains('show')) {
                    console.log('  ✅ showPermissionModal worked');
                    results.edit = true;
                    modal.classList.remove('show'); // Close it
                } else {
                    console.log('  ❌ showPermissionModal failed');
                }
            }, 100);
            
        } catch (e) {
            console.log('  ❌ showPermissionModal error:', e.message);
        }
    }
    
    // Test delete function
    if (typeof showConfirmModal === 'function') {
        try {
            console.log('  Testing showConfirmModal function...');
            showConfirmModal('Test User');
            
            setTimeout(() => {
                const modal = document.getElementById('confirmModal');
                if (modal && modal.classList.contains('show')) {
                    console.log('  ✅ showConfirmModal worked');
                    results.delete = true;
                    modal.classList.remove('show'); // Close it
                } else {
                    console.log('  ❌ showConfirmModal failed');
                }
            }, 100);
            
        } catch (e) {
            console.log('  ❌ showConfirmModal error:', e.message);
        }
    }
    
    console.log('\n📊 Click Results will be available in 500ms...\n');
    
    setTimeout(() => {
        const working = Object.values(results).filter(Boolean).length;
        const total = Object.keys(results).length;
        console.log(`📊 Final Click Results: ${working}/${total} working`);
        
        for (const [test, result] of Object.entries(results)) {
            console.log(`  ${result ? '✅' : '❌'} ${test}`);
        }
    }, 500);
}

// Test 5: Check event listeners
function testEventListeners() {
    console.log('👂 Test 5: Checking event listeners');
    
    const elements = [
        'profileIcon',
        'addUserBtn', 
        'submitUserBtn',
        'cancelUserBtn',
        'savePermissionBtn',
        'cancelEditBtn',
        'confirmYesBtn',
        'confirmNoBtn'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            // Try to get event listeners (works in Chrome dev tools)
            try {
                const listeners = getEventListeners ? getEventListeners(element) : null;
                if (listeners && listeners.click && listeners.click.length > 0) {
                    console.log(`  ✅ ${id}: Has ${listeners.click.length} click listener(s)`);
                } else {
                    console.log(`  ⚠️ ${id}: No click listeners detected (or not accessible)`);
                }
            } catch (e) {
                console.log(`  ⚠️ ${id}: Cannot check listeners (${e.message})`);
            }
        } else {
            console.log(`  ❌ ${id}: Element not found`);
        }
    });
    
    console.log('\n');
}

// Test 6: Check global variables
function testGlobalVariables() {
    console.log('🌍 Test 6: Checking global variables');
    
    const vars = {
        'globalAdminEmail': typeof globalAdminEmail !== 'undefined' ? globalAdminEmail : 'undefined',
        'userName': typeof userName !== 'undefined' ? userName : 'undefined',
        'userToRemove': typeof userToRemove !== 'undefined' ? userToRemove : 'undefined',
        'selectedUserForPermission': typeof selectedUserForPermission !== 'undefined' ? selectedUserForPermission : 'undefined'
    };
    
    for (const [name, value] of Object.entries(vars)) {
        if (value !== 'undefined') {
            console.log(`  ✅ ${name}: ${value}`);
        } else {
            console.log(`  ❌ ${name}: undefined`);
        }
    }
    
    console.log('\n');
}

// Run all tests
function runAllTests() {
    console.log('🚀 Running all BeeMazing button tests...\n');
    
    const results = [];
    
    results.push({ name: 'Elements Exist', pass: testElementsExist() });
    results.push({ name: 'Modal CSS', pass: testModalCSS() });
    results.push({ name: 'Functions Exist', pass: testFunctionsExist() });
    
    testEventListeners();
    testGlobalVariables();
    testButtonClicks();
    
    // Summary after short delay
    setTimeout(() => {
        console.log('📋 TEST SUMMARY');
        console.log('===============');
        
        results.forEach(result => {
            console.log(`${result.pass ? '✅' : '❌'} ${result.name}`);
        });
        
        const passed = results.filter(r => r.pass).length;
        console.log(`\n🎯 Overall: ${passed}/${results.length} tests passed`);
        
        if (passed === results.length) {
            console.log('🎉 All basic tests passed! Button functionality should work.');
        } else {
            console.log('⚠️ Some tests failed. Check the specific failures above.');
        }
        
        console.log('\n📖 Manual test instructions:');
        console.log('1. Click the profile icon (👤) in the header');
        console.log('2. In the opened modal, click the + button');
        console.log('3. Try the ⚙️ and ❌ buttons next to users');
        console.log('4. Each should open the appropriate modal');
        
    }, 1000);
}

// Expose functions globally for manual testing
window.testBeeMazingButtons = {
    runAllTests,
    testElementsExist,
    testModalCSS,
    testFunctionsExist,
    testButtonClicks,
    testEventListeners,
    testGlobalVariables
};

// Auto-run tests
runAllTests();

console.log('\n💡 You can also run individual tests:');
console.log('testBeeMazingButtons.testElementsExist()');
console.log('testBeeMazingButtons.testModalCSS()');
console.log('testBeeMazingButtons.testButtonClicks()');
console.log('etc...\n');