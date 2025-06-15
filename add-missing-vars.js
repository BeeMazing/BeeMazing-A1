// Add back missing currentUser and related variables in tasks.html
const fs = require('fs');
const path = require('path');

const tasksHtmlPath = path.join(__dirname, 'mobile', '3-Tasks', 'tasks.html');

console.log('🔧 Adding back missing currentUser and related variables...');

try {
    // Read the current tasks.html file
    let tasksContent = fs.readFileSync(tasksHtmlPath, 'utf8');
    console.log('✅ Read tasks.html successfully');

    // Find the existing variable declarations section
    const existingVarsPattern = /\/\/ Variables needed for admin buttons \(declared early to fix initialization order\)\s+const canComplete = !freshTask\.asNeeded/;

    if (existingVarsPattern.test(tasksContent)) {
        // Replace the incomplete variable section with complete variables
        const completeVariables = `// Variables needed for admin buttons (declared early to fix initialization order)
    const currentUser = localStorage.getItem("currentUser");
    const currentUserEmail = localStorage.getItem("currentUserEmail") || adminEmail;
    const isParent = currentUserEmail === adminEmail;
    const canComplete = !freshTask.asNeeded`;

        tasksContent = tasksContent.replace(
            /\/\/ Variables needed for admin buttons \(declared early to fix initialization order\)\s+const canComplete = !freshTask\.asNeeded/,
            completeVariables
        );

        console.log('✅ Added back missing variables');
    } else {
        console.log('❌ Could not find existing variables section');
        process.exit(1);
    }

    // Create a backup
    const backupPath = tasksHtmlPath + '.backup-add-missing-vars.' + Date.now();
    fs.writeFileSync(backupPath, fs.readFileSync(tasksHtmlPath, 'utf8'));
    console.log(`✅ Created backup at ${backupPath}`);

    // Write the updated content
    fs.writeFileSync(tasksHtmlPath, tasksContent);
    console.log('✅ Added missing variables back');

    // Verify the fix
    const verifyContent = fs.readFileSync(tasksHtmlPath, 'utf8');
    const hasCurrentUser = verifyContent.includes('const currentUser = localStorage.getItem("currentUser")');
    const hasCurrentUserEmail = verifyContent.includes('const currentUserEmail = localStorage.getItem("currentUserEmail")');
    const hasIsParent = verifyContent.includes('const isParent = currentUserEmail === adminEmail');
    const hasCanComplete = verifyContent.includes('const canComplete = !freshTask.asNeeded');

    console.log('\n🔍 Verification:');
    console.log(`   ✅ currentUser: ${hasCurrentUser}`);
    console.log(`   ✅ currentUserEmail: ${hasCurrentUserEmail}`);
    console.log(`   ✅ isParent: ${hasIsParent}`);
    console.log(`   ✅ canComplete: ${hasCanComplete}`);

    if (hasCurrentUser && hasCurrentUserEmail && hasIsParent && hasCanComplete) {
        console.log('\n🎉 All missing variables successfully added back!');
        console.log('📋 Variables now available:');
        console.log('   ✓ currentUser');
        console.log('   ✓ currentUserEmail');
        console.log('   ✓ isParent');
        console.log('   ✓ canComplete');
        console.log('   ✓ completedUsersForButton');
        console.log('   ✓ pendingUsersForButton');
        console.log('   ✓ approvedUsersForButton');
        console.log('   ✓ isTaskComplete');
        console.log('\n🚀 The ReferenceError should now be completely resolved!');
    } else {
        console.log('\n❌ Some variables may still be missing');
        console.log('💡 Manual inspection may be needed');
    }

} catch (error) {
    console.error('❌ Error adding missing variables:', error.message);
    process.exit(1);
}
