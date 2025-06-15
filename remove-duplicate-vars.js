// Remove duplicate variable declarations in tasks.html
const fs = require('fs');
const path = require('path');

const tasksHtmlPath = path.join(__dirname, 'mobile', '3-Tasks', 'tasks.html');

console.log('🔧 Removing duplicate variable declarations...');

try {
    // Read the current tasks.html file
    let tasksContent = fs.readFileSync(tasksHtmlPath, 'utf8');
    console.log('✅ Read tasks.html successfully');

    // Remove the second set of duplicate variables (around line 4827)
    const secondDuplicatePattern = /\s+\/\/ Admin button variables \(moved here to fix initialization order\)\s+const currentUser = localStorage\.getItem\("currentUser"\);[\s\S]*?const isTaskComplete =[^;]+;/;

    if (secondDuplicatePattern.test(tasksContent)) {
        tasksContent = tasksContent.replace(secondDuplicatePattern, '');
        console.log('✅ Removed second duplicate variable set');
    }

    // Remove the third set of duplicate variables (around line 5400)
    const thirdDuplicatePattern = /\s+const currentUser = localStorage\.getItem\("currentUser"\);\s+const currentUserEmail = localStorage\.getItem\("currentUserEmail"\) \|\| adminEmail;\s+const isParent = currentUserEmail === adminEmail;/;

    if (thirdDuplicatePattern.test(tasksContent)) {
        tasksContent = tasksContent.replace(thirdDuplicatePattern, '');
        console.log('✅ Removed third duplicate variable set');
    }

    // Also remove any other standalone currentUser declarations
    const standaloneCurrentUser = /\s+const currentUser = localStorage\.getItem\("currentUser"\);\s*(?=\n|$)/;

    while (standaloneCurrentUser.test(tasksContent)) {
        tasksContent = tasksContent.replace(standaloneCurrentUser, '');
        console.log('✅ Removed standalone currentUser declaration');
    }

    // Create a backup
    const backupPath = tasksHtmlPath + '.backup-remove-duplicates.' + Date.now();
    fs.writeFileSync(backupPath, fs.readFileSync(tasksHtmlPath, 'utf8'));
    console.log(`✅ Created backup at ${backupPath}`);

    // Write the cleaned content
    fs.writeFileSync(tasksHtmlPath, tasksContent);
    console.log('✅ Removed duplicate variable declarations');

    // Verify the cleanup
    const verifyContent = fs.readFileSync(tasksHtmlPath, 'utf8');
    const currentUserMatches = (verifyContent.match(/const currentUser = localStorage\.getItem\("currentUser"\)/g) || []).length;
    const canCompleteMatches = (verifyContent.match(/const canComplete = !freshTask\.asNeeded/g) || []).length;

    console.log('\n🔍 Verification:');
    console.log(`   currentUser declarations: ${currentUserMatches} (should be 1)`);
    console.log(`   canComplete declarations: ${canCompleteMatches} (should be 1)`);

    if (currentUserMatches === 1 && canCompleteMatches === 1) {
        console.log('\n🎉 Duplicate variable cleanup completed successfully!');
        console.log('📋 Final Structure:');
        console.log('   1. Task Title');
        console.log('   2. Variables declared once (early)');
        console.log('   3. ✏️ Edit & 🗑️ Delete buttons');
        console.log('   4. Task information');
        console.log('\n🚀 No more duplicate variable errors!');
    } else {
        console.log('\n⚠️  Some duplicates may remain or variables may be missing');
        console.log('💡 Manual inspection recommended');
    }

} catch (error) {
    console.error('❌ Error removing duplicates:', error.message);
    process.exit(1);
}
