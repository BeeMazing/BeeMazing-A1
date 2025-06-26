// Add debugging to task click handler in tasks.html
const fs = require('fs');
const path = require('path');

const tasksHtmlPath = path.join(__dirname, 'mobile', '3-Tasks', 'tasks.html');

console.log('🔧 Adding debugging to task click handler...');

try {
    // Read the current tasks.html file
    let tasksContent = fs.readFileSync(tasksHtmlPath, 'utf8');
    console.log('✅ Read tasks.html successfully');

    // Find the specific line where showTaskDetails is called
    const originalLine = 'if (latestTask) showTaskDetails(latestTask);';

    // Replace it with debugging version
    const debugVersion = `if (latestTask) {
                                    console.log('🔍 DEBUG: About to call showTaskDetails with:', latestTask);
                                    console.log('🔍 DEBUG: showTaskDetails function exists:', typeof showTaskDetails === 'function');
                                    try {
                                        showTaskDetails(latestTask);
                                        console.log('✅ DEBUG: showTaskDetails called successfully');
                                    } catch (error) {
                                        console.error('❌ DEBUG: Error calling showTaskDetails:', error);
                                    }
                                } else {
                                    console.error('❌ DEBUG: No latestTask found for:', task.title);
                                }`;

    // Replace the line
    tasksContent = tasksContent.replace(originalLine, debugVersion);

    // Also add debugging at the start of the click handler
    const clickHandlerStart = 'taskDiv.addEventListener("click", async (e) => {';
    const debugClickStart = `taskDiv.addEventListener("click", async (e) => {
                            console.log('🔍 DEBUG: Task clicked!', task.title);`;

    tasksContent = tasksContent.replace(clickHandlerStart, debugClickStart);

    // Add debugging to the fetch call
    const fetchLine = 'const latest = await fetch(';
    const debugFetch = `console.log('🔍 DEBUG: Fetching latest task data for:', task.title);
                                const latest = await fetch(`;

    tasksContent = tasksContent.replace(fetchLine, debugFetch);

    // Add debugging for task finding
    const findTaskLine = 'const latestTask =';
    const debugFindTask = `console.log('🔍 DEBUG: Looking for task in response...');
                                const latestTask =`;

    tasksContent = tasksContent.replace(findTaskLine, debugFindTask);

    // Create a backup
    const backupPath = tasksHtmlPath + '.backup-debug.' + Date.now();
    fs.writeFileSync(backupPath, fs.readFileSync(tasksHtmlPath, 'utf8'));
    console.log(`✅ Created backup at ${backupPath}`);

    // Write the fixed content
    fs.writeFileSync(tasksHtmlPath, tasksContent);
    console.log('✅ Added debugging to task click handler');

    console.log('\n🎉 Debug version deployed!');
    console.log('📋 What was added:');
    console.log('   ✓ Console log when task is clicked');
    console.log('   ✓ Console log before fetching latest data');
    console.log('   ✓ Console log when searching for task');
    console.log('   ✓ Console log before calling showTaskDetails');
    console.log('   ✓ Error handling around showTaskDetails call');
    console.log('   ✓ Warning if no latestTask found');

    console.log('\n🔍 Now when you click a task, you should see:');
    console.log('   🔍 DEBUG: Task clicked! [Task Name]');
    console.log('   🔍 DEBUG: Fetching latest task data for: [Task Name]');
    console.log('   🔍 DEBUG: Looking for task in response...');
    console.log('   🔍 DEBUG: About to call showTaskDetails with: [Task Object]');
    console.log('   🔍 DEBUG: showTaskDetails function exists: true/false');
    console.log('   ✅ DEBUG: showTaskDetails called successfully');
    console.log('   OR');
    console.log('   ❌ DEBUG: Error calling showTaskDetails: [Error Details]');

} catch (error) {
    console.error('❌ Error adding debugging:', error.message);
    process.exit(1);
}
