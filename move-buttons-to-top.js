// Move admin buttons to the top of the task card after the title
const fs = require('fs');
const path = require('path');

const tasksHtmlPath = path.join(__dirname, 'mobile', '3-Tasks', 'tasks.html');

console.log('🔧 Moving admin buttons to the top of the task card...');

try {
    // Read the current tasks.html file
    let tasksContent = fs.readFileSync(tasksHtmlPath, 'utf8');
    console.log('✅ Read tasks.html successfully');

    // Find the current admin buttons section (at the bottom)
    const bottomButtonsPattern = /modalHTML \+= `\s*<div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #FBB740;">[\s\S]*?<\/div>\s*`;/;

    // Extract the buttons HTML
    const buttonMatch = tasksContent.match(bottomButtonsPattern);

    if (!buttonMatch) {
        console.log('❌ Could not find current buttons pattern');
        process.exit(1);
    }

    const buttonsHTML = buttonMatch[0];
    console.log('✅ Found admin buttons section');

    // Remove the buttons from the bottom
    tasksContent = tasksContent.replace(bottomButtonsPattern, '');
    console.log('✅ Removed buttons from bottom');

    // Create new buttons HTML for the top (without the margin-top and border-top)
    const topButtonsHTML = buttonsHTML
        .replace('margin-top: 20px; padding-top: 15px; border-top: 1px solid #FBB740;', 'margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #FBB740;')
        .replace('margin-bottom: 20px;', 'margin-top: 10px;');

    // Find where to insert the buttons (after the title and occurrence info)
    const titlePattern = /let modalHTML = `<h2>\${freshTask\.title}\${statusSymbol}<\/h2>`;/;

    if (titlePattern.test(tasksContent)) {
        // Find the end of the occurrence info section or start of main content
        const insertionPoint = /modalHTML \+= `<\/div>`;[\s\S]*?\/\/ Buzz Points/;

        if (insertionPoint.test(tasksContent)) {
            // Insert buttons after occurrence info but before main content
            tasksContent = tasksContent.replace(
                /(modalHTML \+= `<\/div>`;[\s\S]*?)(\/\/ Buzz Points)/,
                `$1\n\n    ${topButtonsHTML}\n\n                            $2`
            );
            console.log('✅ Inserted buttons after occurrence info');
        } else {
            // Fallback: insert after title
            tasksContent = tasksContent.replace(
                titlePattern,
                `let modalHTML = \`<h2>\${freshTask.title}\${statusSymbol}</h2>\`;

    ${topButtonsHTML}`
            );
            console.log('✅ Inserted buttons after title (fallback)');
        }
    } else {
        console.log('❌ Could not find title pattern to insert buttons');
        process.exit(1);
    }

    // Create a backup
    const backupPath = tasksHtmlPath + '.backup-buttons-top.' + Date.now();
    fs.writeFileSync(backupPath, fs.readFileSync(tasksHtmlPath, 'utf8'));
    console.log(`✅ Created backup at ${backupPath}`);

    // Write the updated content
    fs.writeFileSync(tasksHtmlPath, tasksContent);
    console.log('✅ Moved admin buttons to top of task card');

    // Verify the changes
    const verifyContent = fs.readFileSync(tasksHtmlPath, 'utf8');
    const hasTopButtons = verifyContent.includes('border-bottom: 1px solid #FBB740');
    const hasBottomButtons = verifyContent.includes('border-top: 1px solid #FBB740');

    console.log('\n🔍 Verification:');
    console.log(`   ✅ Buttons at top (border-bottom): ${hasTopButtons}`);
    console.log(`   ❌ Buttons at bottom (border-top): ${!hasBottomButtons}`);

    if (hasTopButtons && !hasBottomButtons) {
        console.log('\n🎉 Admin buttons successfully moved to top!');
        console.log('📋 New Layout:');
        console.log('   1. Task Title');
        console.log('   2. ✏️ Edit & 🗑️ Delete buttons');
        console.log('   3. Task information (status, buzz points, etc.)');
        console.log('\n🚀 The buttons should now appear at the top of the modal!');
    } else {
        console.log('\n❌ Button move may not have been completed correctly');
        console.log('💡 Please check the modal layout manually');
    }

} catch (error) {
    console.error('❌ Error moving buttons to top:', error.message);
    process.exit(1);
}
