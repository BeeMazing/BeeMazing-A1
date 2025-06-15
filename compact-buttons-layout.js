// Make buttons compact, rename to 'Done', and arrange in one line
const fs = require('fs');
const path = require('path');

const tasksHtmlPath = path.join(__dirname, 'mobile', '3-Tasks', 'tasks.html');

console.log('🔧 Making buttons compact and arranging in one line...');

try {
    // Read the current tasks.html file
    let tasksContent = fs.readFileSync(tasksHtmlPath, 'utf8');
    console.log('✅ Read tasks.html successfully');

    // Find the current admin buttons section
    const currentButtonsPattern = /modalHTML \+= `\s*<div style="margin-top: 10px; padding-bottom: 15px; border-bottom: 1px solid #FBB740;">[\s\S]*?<\/div>\s*`;/;

    const newCompactButtonsHTML = `modalHTML += \`
        <div style="margin-top: 10px; margin-bottom: 15px; padding: 10px 0; border-bottom: 1px solid #FBB740;">
            <!-- Compact Single Line Button Layout -->
            <div style="display: flex; gap: 8px; justify-content: center; align-items: center; flex-wrap: wrap;">
                \${
                    canComplete && !isTaskComplete
                        ? \`<button id="completeTaskBtn" style="padding: 8px 16px; background: #28a745; color: white; font-weight: 600; border-radius: 6px; border: none; cursor: pointer; font-size: 13px; white-space: nowrap;">✓ Done</button>\`
                        : ""
                }

                <div style="position: relative;">
                    <button id="editDropdownBtn" style="padding: 8px 16px; background: #FBB740; color: #5D4E41; font-weight: 600; border-radius: 6px; border: none; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 6px; white-space: nowrap;">
                        ✏️ Edit
                        <span style="font-size: 10px;">▼</span>
                    </button>
                    <div id="editDropdown" style="display: none; position: absolute; top: 100%; left: 0; min-width: 140px; background: white; border: 2px solid #FBB740; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1001; margin-top: 3px;">
                        <button id="editOccurrenceBtn" style="width: 100%; padding: 10px 12px; background: none; border: none; color: #5D4E41; cursor: pointer; font-size: 12px; text-align: left; border-bottom: 1px solid #f0f0f0; font-weight: 500;" onmouseover="this.style.background='#FFF6E9'" onmouseout="this.style.background='none'">
                            📅 This Day
                        </button>
                        <button id="editFutureBtn" style="width: 100%; padding: 10px 12px; background: none; border: none; color: #5D4E41; cursor: pointer; font-size: 12px; text-align: left; border-bottom: 1px solid #f0f0f0; font-weight: 500;" onmouseover="this.style.background='#FFF6E9'" onmouseout="this.style.background='none'">
                            ⏭️ Future
                        </button>
                        <button id="editTaskBtn" style="width: 100%; padding: 10px 12px; background: none; border: none; color: #5D4E41; cursor: pointer; font-size: 12px; text-align: left; font-weight: 500;" onmouseover="this.style.background='#FFF6E9'" onmouseout="this.style.background='none'">
                            📝 Entire Task
                        </button>
                    </div>
                </div>

                <div style="position: relative;">
                    <button id="deleteDropdownBtn" style="padding: 8px 16px; background: #D32F2F; color: white; font-weight: 600; border-radius: 6px; border: none; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 6px; white-space: nowrap;">
                        🗑️ Delete
                        <span style="font-size: 10px;">▼</span>
                    </button>
                    <div id="deleteDropdown" style="display: none; position: absolute; top: 100%; left: 0; min-width: 140px; background: white; border: 2px solid #D32F2F; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1001; margin-top: 3px;">
                        <button id="deleteOccurrenceBtn" style="width: 100%; padding: 10px 12px; background: none; border: none; color: #D32F2F; cursor: pointer; font-size: 12px; text-align: left; border-bottom: 1px solid #f0f0f0; font-weight: 500;" onmouseover="this.style.background='#ffe6e6'" onmouseout="this.style.background='none'">
                            📅 This Day
                        </button>
                        <button id="deleteFutureBtn" style="width: 100%; padding: 10px 12px; background: none; border: none; color: #D32F2F; cursor: pointer; font-size: 12px; text-align: left; border-bottom: 1px solid #f0f0f0; font-weight: 500;" onmouseover="this.style.background='#ffe6e6'" onmouseout="this.style.background='none'">
                            ⏭️ Future
                        </button>
                        <button id="deleteEntireTaskBtn" style="width: 100%; padding: 10px 12px; background: none; border: none; color: #D32F2F; cursor: pointer; font-size: 12px; text-align: left; font-weight: 500;" onmouseover="this.style.background='#ffe6e6'" onmouseout="this.style.background='none'">
                            🗑️ Entire Task
                        </button>
                    </div>
                </div>
            </div>
        </div>
    \`;`;

    // Replace the current buttons section
    if (currentButtonsPattern.test(tasksContent)) {
        tasksContent = tasksContent.replace(currentButtonsPattern, newCompactButtonsHTML);
        console.log('✅ Replaced buttons with compact single-line layout');
    } else {
        console.log('❌ Could not find current buttons pattern');
        console.log('🔍 Looking for alternative patterns...');

        // Try alternative patterns
        const altPattern = /modalHTML \+= [`'][\s\S]*?Done[\s\S]*?Delete[\s\S]*?[`'];/;
        if (altPattern.test(tasksContent)) {
            tasksContent = tasksContent.replace(altPattern, newCompactButtonsHTML);
            console.log('✅ Found and replaced alternative button pattern');
        } else {
            console.log('❌ Could not find suitable pattern to replace');
            process.exit(1);
        }
    }

    // Create a backup
    const backupPath = tasksHtmlPath + '.backup-compact-layout.' + Date.now();
    fs.writeFileSync(backupPath, fs.readFileSync(tasksHtmlPath, 'utf8'));
    console.log(`✅ Created backup at ${backupPath}`);

    // Write the updated content
    fs.writeFileSync(tasksHtmlPath, tasksContent);
    console.log('✅ Applied compact single-line button layout');

    // Verify the changes
    const verifyContent = fs.readFileSync(tasksHtmlPath, 'utf8');
    const hasDoneButton = verifyContent.includes('✓ Done');
    const hasCompactLayout = verifyContent.includes('display: flex; gap: 8px; justify-content: center');
    const hasShorterText = verifyContent.includes('📅 This Day') && verifyContent.includes('📝 Entire Task');

    console.log('\n🔍 Verification:');
    console.log(`   ✅ "Done" button: ${hasDoneButton}`);
    console.log(`   ✅ Compact flex layout: ${hasCompactLayout}`);
    console.log(`   ✅ Shorter button text: ${hasShorterText}`);

    if (hasDoneButton && hasCompactLayout && hasShorterText) {
        console.log('\n🎉 Compact button layout completed successfully!');
        console.log('📋 New Compact Design:');
        console.log('   • Single horizontal line layout');
        console.log('   • ✓ Done (renamed from "Mark as Done")');
        console.log('   • ✏️ Edit ▼ (compact dropdown)');
        console.log('   • 🗑️ Delete ▼ (compact dropdown)');
        console.log('   • Shorter dropdown text (This Day, Future, Entire Task)');
        console.log('   • Reduced padding and spacing');
        console.log('   • Flex-wrap for mobile responsiveness');
        console.log('\n🚀 Buttons are now compact and in a single line!');
    } else {
        console.log('\n❌ Compact layout may not have been applied correctly');
        console.log('💡 Please check the button layout manually');
    }

} catch (error) {
    console.error('❌ Error applying compact layout:', error.message);
    process.exit(1);
}
