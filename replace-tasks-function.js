// Script to replace the showTaskDetails function in tasks.html with the new universal version

const fs = require('fs');
const path = require('path');

const tasksHtmlPath = path.join(__dirname, 'mobile', '3-Tasks', 'tasks.html');
const universalFunctionPath = path.join(__dirname, 'universal-admin-task-details.js');

console.log('🔧 Starting function replacement in tasks.html...');

try {
    // Read the current tasks.html file
    const tasksContent = fs.readFileSync(tasksHtmlPath, 'utf8');
    console.log('✅ Read tasks.html successfully');

    // Read the new universal function
    const universalFunction = fs.readFileSync(universalFunctionPath, 'utf8');
    console.log('✅ Read universal function successfully');

    // Find the start and end of the current showTaskDetails function
    const functionStartPattern = /async function showTaskDetails\(task\) \{/;
    const functionStartMatch = tasksContent.match(functionStartPattern);

    if (!functionStartMatch) {
        throw new Error('Could not find showTaskDetails function start');
    }

    const functionStartIndex = functionStartMatch.index;
    console.log(`✅ Found function start at character ${functionStartIndex}`);

    // Find the end of the function by counting braces
    let braceCount = 0;
    let foundFirstBrace = false;
    let functionEndIndex = functionStartIndex;

    for (let i = functionStartIndex; i < tasksContent.length; i++) {
        const char = tasksContent[i];

        if (char === '{') {
            braceCount++;
            foundFirstBrace = true;
        } else if (char === '}') {
            braceCount--;

            if (foundFirstBrace && braceCount === 0) {
                functionEndIndex = i + 1; // Include the closing brace
                break;
            }
        }
    }

    console.log(`✅ Found function end at character ${functionEndIndex}`);

    // Extract the parts before and after the function
    const beforeFunction = tasksContent.substring(0, functionStartIndex);
    const afterFunction = tasksContent.substring(functionEndIndex);

    // Add proper indentation to match the original file (12 spaces)
    const indentedUniversalFunction = universalFunction
        .split('\n')
        .map((line, index) => {
            if (index === 0) {
                return '            ' + line; // First line gets 12 spaces
            } else if (line.trim() === '') {
                return line; // Empty lines stay empty
            } else {
                return '            ' + line; // All other lines get 12 spaces
            }
        })
        .join('\n');

    // Combine the parts with the new function
    const newContent = beforeFunction + indentedUniversalFunction + afterFunction;

    // Create a backup of the original file
    const backupPath = tasksHtmlPath + '.backup.' + Date.now();
    fs.writeFileSync(backupPath, tasksContent);
    console.log(`✅ Created backup at ${backupPath}`);

    // Write the new content
    fs.writeFileSync(tasksHtmlPath, newContent);
    console.log('✅ Successfully replaced showTaskDetails function in tasks.html');

    // Verify the replacement worked
    const verifyContent = fs.readFileSync(tasksHtmlPath, 'utf8');
    if (verifyContent.includes('// Universal task details styling and logic')) {
        console.log('✅ Verification successful - new function is in place');
    } else {
        throw new Error('Verification failed - new function not found');
    }

    console.log('\n🎉 Function replacement completed successfully!');
    console.log('📋 Summary:');
    console.log(`   - Original function: ${functionEndIndex - functionStartIndex} characters`);
    console.log(`   - New function: ${universalFunction.length} characters`);
    console.log(`   - Backup created: ${path.basename(backupPath)}`);
    console.log('\n🔍 The new function includes:');
    console.log('   ✓ Universal styling from userTasks.html');
    console.log('   ✓ All admin edit/delete buttons preserved');
    console.log('   ✓ Enhanced status detection');
    console.log('   ✓ Better completion handling');
    console.log('   ✓ Improved task matching logic');

} catch (error) {
    console.error('❌ Error during function replacement:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
}
