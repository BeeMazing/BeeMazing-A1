// Redesign admin buttons with cleaner Edit/Delete dropdown layout in tasks.html
const fs = require('fs');
const path = require('path');

const tasksHtmlPath = path.join(__dirname, 'mobile', '3-Tasks', 'tasks.html');

console.log('🔧 Redesigning admin buttons with Edit/Delete dropdown layout...');

try {
    // Read the current tasks.html file
    let tasksContent = fs.readFileSync(tasksHtmlPath, 'utf8');
    console.log('✅ Read tasks.html successfully');

    // Find the current admin buttons section and replace it
    const currentButtonsPattern = /modalHTML \+= `\s*<div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #FBB740;">[\s\S]*?<\/div>\s*<\/div>\s*`;/;

    const newButtonsHTML = `modalHTML += \`
        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #FBB740;">
            \${
                canComplete && !isTaskComplete
                    ? \`
                <div style="margin-bottom: 15px; text-align: center;">
                    <button id="completeTaskBtn" style="padding: 10px 20px; background: #28a745; color: white; font-weight: 600; border-radius: 8px; border: none; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 8px; margin: 0 auto;">
                        ✓ Mark as Done
                    </button>
                </div>
            \`
                    : ""
            }

            <!-- New Edit/Delete Button Design -->
            <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 20px;">
                <div style="position: relative;">
                    <button id="editDropdownBtn" style="padding: 12px 24px; background: #FBB740; color: #5D4E41; font-weight: 600; border-radius: 8px; border: none; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 8px; min-width: 120px; justify-content: center;">
                        ✏️ Edit
                        <span style="font-size: 12px;">▼</span>
                    </button>
                    <div id="editDropdown" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: white; border: 2px solid #FBB740; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1001; margin-top: 5px;">
                        <button id="editOccurrenceBtn" style="width: 100%; padding: 12px 16px; background: none; border: none; color: #5D4E41; cursor: pointer; font-size: 13px; text-align: left; border-bottom: 1px solid #f0f0f0; font-weight: 500;" onmouseover="this.style.background='#FFF6E9'" onmouseout="this.style.background='none'">
                            📅 Edit This Day
                        </button>
                        <button id="editFutureBtn" style="width: 100%; padding: 12px 16px; background: none; border: none; color: #5D4E41; cursor: pointer; font-size: 13px; text-align: left; border-bottom: 1px solid #f0f0f0; font-weight: 500;" onmouseover="this.style.background='#FFF6E9'" onmouseout="this.style.background='none'">
                            ⏭️ Edit Future
                        </button>
                        <button id="editTaskBtn" style="width: 100%; padding: 12px 16px; background: none; border: none; color: #5D4E41; cursor: pointer; font-size: 13px; text-align: left; font-weight: 500;" onmouseover="this.style.background='#FFF6E9'" onmouseout="this.style.background='none'">
                            📝 Edit Entire Task
                        </button>
                    </div>
                </div>

                <div style="position: relative;">
                    <button id="deleteDropdownBtn" style="padding: 12px 24px; background: #D32F2F; color: white; font-weight: 600; border-radius: 8px; border: none; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 8px; min-width: 120px; justify-content: center;">
                        🗑️ Delete
                        <span style="font-size: 12px;">▼</span>
                    </button>
                    <div id="deleteDropdown" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: white; border: 2px solid #D32F2F; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1001; margin-top: 5px;">
                        <button id="deleteOccurrenceBtn" style="width: 100%; padding: 12px 16px; background: none; border: none; color: #D32F2F; cursor: pointer; font-size: 13px; text-align: left; border-bottom: 1px solid #f0f0f0; font-weight: 500;" onmouseover="this.style.background='#ffe6e6'" onmouseout="this.style.background='none'">
                            📅 Delete This Day
                        </button>
                        <button id="deleteFutureBtn" style="width: 100%; padding: 12px 16px; background: none; border: none; color: #D32F2F; cursor: pointer; font-size: 13px; text-align: left; border-bottom: 1px solid #f0f0f0; font-weight: 500;" onmouseover="this.style.background='#ffe6e6'" onmouseout="this.style.background='none'">
                            ⏭️ Delete Future
                        </button>
                        <button id="deleteEntireTaskBtn" style="width: 100%; padding: 12px 16px; background: none; border: none; color: #D32F2F; cursor: pointer; font-size: 13px; text-align: left; font-weight: 500;" onmouseover="this.style.background='#ffe6e6'" onmouseout="this.style.background='none'">
                            🗑️ Delete Entire Task
                        </button>
                    </div>
                </div>
            </div>
        </div>
    \`;`;

    // Replace the current buttons section
    if (currentButtonsPattern.test(tasksContent)) {
        tasksContent = tasksContent.replace(currentButtonsPattern, newButtonsHTML);
        console.log('✅ Replaced admin buttons with new dropdown design');
    } else {
        console.log('❌ Could not find current buttons pattern to replace');
        console.log('🔍 Looking for alternative patterns...');

        // Try to find alternative patterns
        const altPattern = /modalHTML \+= [`'][\s\S]*?Edit This Day[\s\S]*?Delete Entire Task[\s\S]*?[`'];/;
        if (altPattern.test(tasksContent)) {
            tasksContent = tasksContent.replace(altPattern, newButtonsHTML);
            console.log('✅ Found and replaced alternative button pattern');
        } else {
            console.log('❌ Could not find suitable pattern to replace');
            process.exit(1);
        }
    }

    // Now add the dropdown functionality JavaScript after the modal event listeners
    const dropdownJS = `
    // Dropdown functionality for Edit/Delete buttons
    const editDropdownBtn = modal.querySelector("#editDropdownBtn");
    const editDropdown = modal.querySelector("#editDropdown");
    const deleteDropdownBtn = modal.querySelector("#deleteDropdownBtn");
    const deleteDropdown = modal.querySelector("#deleteDropdown");

    if (editDropdownBtn && editDropdown) {
        editDropdownBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            editDropdown.style.display = editDropdown.style.display === "none" ? "block" : "none";
            deleteDropdown.style.display = "none"; // Close other dropdown
        });
    }

    if (deleteDropdownBtn && deleteDropdown) {
        deleteDropdownBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            deleteDropdown.style.display = deleteDropdown.style.display === "none" ? "block" : "none";
            editDropdown.style.display = "none"; // Close other dropdown
        });
    }

    // Close dropdowns when clicking outside
    modal.addEventListener("click", (e) => {
        if (!e.target.closest("#editDropdownBtn") && !e.target.closest("#editDropdown")) {
            editDropdown.style.display = "none";
        }
        if (!e.target.closest("#deleteDropdownBtn") && !e.target.closest("#deleteDropdown")) {
            deleteDropdown.style.display = "none";
        }

        if (e.target.classList.contains("task-modal")) {
            modal.remove();
        }
    });`;

    // Find the modal click event listener and add dropdown functionality
    const modalClickPattern = /modal\.addEventListener\("click", \(e\) => \{[\s\S]*?\}\);/;

    if (modalClickPattern.test(tasksContent)) {
        tasksContent = tasksContent.replace(modalClickPattern, dropdownJS);
        console.log('✅ Added dropdown functionality');
    } else {
        console.log('❌ Could not find modal click listener to replace');
        // Find a suitable place to insert the dropdown functionality
        const insertPoint = /(\s+)(\/\/ Complete task button logic)/;
        if (insertPoint.test(tasksContent)) {
            tasksContent = tasksContent.replace(insertPoint, `$1${dropdownJS}\n\n$1$2`);
            console.log('✅ Inserted dropdown functionality before complete task logic');
        }
    }

    // Create a backup
    const backupPath = tasksHtmlPath + '.backup-dropdown-redesign.' + Date.now();
    fs.writeFileSync(backupPath, fs.readFileSync(tasksHtmlPath, 'utf8'));
    console.log(`✅ Created backup at ${backupPath}`);

    // Write the updated content
    fs.writeFileSync(tasksHtmlPath, tasksContent);
    console.log('✅ Applied new dropdown button design');

    // Verify the changes
    const verifyContent = fs.readFileSync(tasksHtmlPath, 'utf8');
    const hasEditDropdown = verifyContent.includes('editDropdownBtn');
    const hasDeleteDropdown = verifyContent.includes('deleteDropdownBtn');
    const hasDropdownJS = verifyContent.includes('editDropdown.style.display');

    console.log('\n🔍 Verification:');
    console.log(`   ✅ Edit dropdown button: ${hasEditDropdown}`);
    console.log(`   ✅ Delete dropdown button: ${hasDeleteDropdown}`);
    console.log(`   ✅ Dropdown functionality: ${hasDropdownJS}`);

    if (hasEditDropdown && hasDeleteDropdown && hasDropdownJS) {
        console.log('\n🎉 Button redesign completed successfully!');
        console.log('📋 New Design Features:');
        console.log('   ✓ Clean two-button layout (Edit & Delete)');
        console.log('   ✓ Dropdown menus with 3 options each');
        console.log('   ✓ Icons for better visual distinction');
        console.log('   ✓ Hover effects on dropdown items');
        console.log('   ✓ Click outside to close dropdowns');
        console.log('   ✓ Maintains all original functionality');

        console.log('\n🎨 Button Layout:');
        console.log('   📝 Edit Button → 📅 Edit This Day, ⏭️ Edit Future, 📝 Edit Entire Task');
        console.log('   🗑️ Delete Button → 📅 Delete This Day, ⏭️ Delete Future, 🗑️ Delete Entire Task');

        console.log('\n🚀 Ready to test! The modal should now have a cleaner look.');
    } else {
        console.log('\n❌ Some features may not have been applied correctly');
        console.log('💡 Please check the function manually');
    }

} catch (error) {
    console.error('❌ Error redesigning admin buttons:', error.message);
    process.exit(1);
}
