// Add all missing admin button event handlers to tasks.html
const fs = require('fs');
const path = require('path');

const tasksHtmlPath = path.join(__dirname, 'mobile', '3-Tasks', 'tasks.html');

console.log('🔧 Adding missing admin button event handlers to tasks.html...');

try {
    // Read the current tasks.html file
    let tasksContent = fs.readFileSync(tasksHtmlPath, 'utf8');
    console.log('✅ Read tasks.html successfully');

    // Find the location where we need to add the missing handlers
    const insertionPoint = '// Add other edit and delete button handlers here (editFutureBtn, editTaskBtn, deleteOccurrenceBtn, deleteFutureBtn, deleteEntireTaskBtn)';

    if (!tasksContent.includes(insertionPoint)) {
        console.log('❌ Could not find insertion point. Looking for alternative patterns...');

        // Try to find the end of editOccurrenceBtn handler
        const editOccurrenceEnd = /window\.location\.href = "\/BeeMazing-A1\/mobile\/3-Tasks\/addtasks\.html";\s*}\);\s*}\s*\/\/\s*Add other/;
        if (editOccurrenceEnd.test(tasksContent)) {
            console.log('✅ Found alternative insertion point');
        } else {
            console.log('❌ Could not find suitable insertion point');
            process.exit(1);
        }
    }

    // Complete admin handlers code
    const adminHandlers = `
    // Edit future occurrences (preserved from original tasks.html)
    const editFutureBtn = modal.querySelector("#editFutureBtn");
    if (editFutureBtn) {
        editFutureBtn.addEventListener("click", async () => {
            const isOccurrenceTask = freshTask.originalTitle && freshTask.totalOccurrences;
            const isOccurrenceByTitle = freshTask.title.includes(" - ") &&
                (freshTask.title.includes("1st") || freshTask.title.includes("2nd") || freshTask.title.includes("3rd"));

            let modifiedTask = { ...freshTask };

            if (freshTask.exceptions && freshTask.exceptions[selectedDate] && freshTask.exceptions[selectedDate].task) {
                const exceptionTask = freshTask.exceptions[selectedDate].task;
                modifiedTask = {
                    ...freshTask,
                    ...exceptionTask,
                    exceptions: freshTask.exceptions,
                    completions: freshTask.completions,
                };
            }

            if (isOccurrenceTask || isOccurrenceByTitle) {
                const originalTitle = freshTask.originalTitle || freshTask.title.split(" - ")[0];
                const adminEmail = localStorage.getItem("currentAdminEmail");

                try {
                    const response = await fetch(
                        \`https://beemazing1.onrender.com/api/tasks?adminEmail=\${encodeURIComponent(adminEmail)}&t=\${Date.now()}\`,
                        { cache: "no-store" },
                    );
                    if (response.ok) {
                        const result = await response.json();
                        const allOccurrences = result.tasks.filter(
                            (t) =>
                                (t.originalTitle === originalTitle || t.title.startsWith(originalTitle + " - ")) &&
                                t.date === freshTask.date,
                        );

                        if (allOccurrences.length > 0) {
                            allOccurrences.sort((a, b) => (a.occurrence || 1) - (b.occurrence || 1));

                            modifiedTask = {
                                ...allOccurrences[0],
                                title: originalTitle,
                                timesPerDay: allOccurrences.length,
                                totalOccurrences: allOccurrences.length,
                                users: [...new Set(allOccurrences.flatMap((occ) => occ.users || []))],
                                dueTimes: allOccurrences.map((occ) => occ.dueTimes && occ.dueTimes[0] ? occ.dueTimes[0] : "").filter((time) => time),
                                occurrence: undefined,
                                originalTitle: undefined,
                            };
                        }
                    }
                } catch (error) {
                    console.error("Error fetching occurrence data for future edit:", error);
                }

                modifiedTask.isFutureEdit = true;
                modifiedTask.isOccurrenceGroupEdit = true;
                modifiedTask.splitDate = selectedDate;
                modifiedTask.originalStartDate = freshTask.date.split(" to ")[0];
                modifiedTask.originalTitle = originalTitle;
                modifiedTask.totalOccurrences = modifiedTask.totalOccurrences || freshTask.totalOccurrences || 3;

                localStorage.setItem("familyApp_editTask", JSON.stringify(modifiedTask));
                localStorage.setItem("familyApp_editTask_index", originalTitle + "-" + freshTask.date + "-future-group");
            } else {
                modifiedTask.isFutureEdit = true;
                modifiedTask.splitDate = selectedDate;
                modifiedTask.originalStartDate = freshTask.date.split(" to ")[0];
                localStorage.setItem("familyApp_editTask", JSON.stringify(modifiedTask));
                localStorage.setItem("familyApp_editTask_index", freshTask.title + "-" + freshTask.date + "-future");
            }

            window.location.href = "/BeeMazing-A1/mobile/3-Tasks/addtasks.html";
        });
    }

    // Edit entire task (preserved from original tasks.html)
    const editTaskBtn = modal.querySelector("#editTaskBtn");
    if (editTaskBtn) {
        editTaskBtn.addEventListener("click", async () => {
            const isOccurrenceTask = freshTask.originalTitle && freshTask.totalOccurrences;
            const isOccurrenceByTitle = freshTask.title.includes(" - ") &&
                (freshTask.title.includes("1st") || freshTask.title.includes("2nd") || freshTask.title.includes("3rd"));

            let taskDataToEdit = { ...freshTask };

            if (freshTask.exceptions && freshTask.exceptions[selectedDate] && freshTask.exceptions[selectedDate].task) {
                const exceptionTask = freshTask.exceptions[selectedDate].task;
                taskDataToEdit = {
                    ...freshTask,
                    ...exceptionTask,
                    exceptions: freshTask.exceptions,
                    completions: freshTask.completions,
                };
            }

            if (isOccurrenceTask || isOccurrenceByTitle) {
                const originalTitle = freshTask.originalTitle || freshTask.title.split(" - ")[0];
                const adminEmail = localStorage.getItem("currentAdminEmail");

                try {
                    await new Promise((resolve) => setTimeout(resolve, 3000));

                    let response;
                    let attempts = 0;
                    const maxAttempts = 3;

                    while (attempts < maxAttempts) {
                        attempts++;
                        const cacheBuster = \`\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}_attempt\${attempts}\`;

                        response = await fetch(
                            \`https://beemazing1.onrender.com/api/tasks?adminEmail=\${encodeURIComponent(adminEmail)}&t=\${cacheBuster}&refresh=true&force=true\`,
                            {
                                cache: "no-store",
                                headers: {
                                    "Cache-Control": "no-cache, no-store, must-revalidate",
                                    Pragma: "no-cache",
                                    Expires: "0",
                                    "X-Force-Refresh": "true",
                                },
                            },
                        );

                        if (response.ok) {
                            break;
                        }

                        if (attempts < maxAttempts) {
                            await new Promise((resolve) => setTimeout(resolve, 1000));
                        }
                    }

                    if (response.ok) {
                        const result = await response.json();
                        const allOccurrences = result.tasks.filter(
                            (t) =>
                                (t.originalTitle === originalTitle || t.title.startsWith(originalTitle + " - ")) &&
                                t.date === freshTask.date,
                        );

                        if (allOccurrences.length > 0) {
                            allOccurrences.sort((a, b) => (a.occurrence || 1) - (b.occurrence || 1));

                            taskDataToEdit = {
                                ...allOccurrences[0],
                                title: originalTitle,
                                timesPerDay: allOccurrences.length,
                                totalOccurrences: allOccurrences.length,
                                users: [...new Set(allOccurrences.flatMap((occ) => occ.users || []))],
                                dueTimes: allOccurrences.map((occ) => occ.dueTimes && occ.dueTimes[0] ? occ.dueTimes[0] : "").filter((time) => time),
                                originalTitle: originalTitle,
                                isOccurrenceGroupEdit: true,
                                occurrence: undefined,
                            };
                        }
                    }
                } catch (error) {
                    console.error("Error fetching occurrence data:", error);
                }
            }

            localStorage.setItem("familyApp_editTask", JSON.stringify(taskDataToEdit));
            localStorage.setItem("familyApp_editTask_index", taskDataToEdit.title + "-" + freshTask.date + "-entire");

            const admin = localStorage.getItem("currentAdminEmail");
            const user = localStorage.getItem("currentUser");

            if (admin && user) {
                const targetUrl = \`/BeeMazing-A1/mobile/3-Tasks/addtasks.html?admin=\${encodeURIComponent(admin)}&user=\${encodeURIComponent(user)}\`;
                window.location.href = targetUrl;
            } else {
                alert("Admin or user information missing. Please log in again.");
            }
        });
    }

    // Delete single occurrence (preserved from original tasks.html)
    const deleteOccurrenceBtn = modal.querySelector("#deleteOccurrenceBtn");
    if (deleteOccurrenceBtn) {
        deleteOccurrenceBtn.addEventListener("click", async () => {
            if (deleteOccurrenceBtn.disabled) return;
            deleteOccurrenceBtn.disabled = true;
            const originalText = deleteOccurrenceBtn.textContent;
            deleteOccurrenceBtn.textContent = "Deleting...";

            try {
                if (confirm(\`Are you sure you want to delete this task occurrence on \${selectedDate}? This will only affect this specific date.\`)) {
                    modal.remove();
                    await deleteSingleOccurrence(freshTask.title, selectedDate, freshTask.date.split(" to ")[0]);
                    loadTasksForDate(selectedDate);
                }
            } finally {
                deleteOccurrenceBtn.disabled = false;
                deleteOccurrenceBtn.textContent = originalText;
            }
        });
    }

    // Delete future occurrences (preserved from original tasks.html)
    const deleteFutureBtn = modal.querySelector("#deleteFutureBtn");
    if (deleteFutureBtn) {
        deleteFutureBtn.addEventListener("click", async () => {
            if (deleteFutureBtn.disabled) return;
            deleteFutureBtn.disabled = true;
            const originalText = deleteFutureBtn.textContent;
            deleteFutureBtn.textContent = "Deleting...";

            try {
                const isOccurrenceTask = freshTask.originalTitle && freshTask.totalOccurrences;
                const isOccurrenceByTitle = freshTask.title.includes(" - ") &&
                    (freshTask.title.includes("1st") || freshTask.title.includes("2nd") || freshTask.title.includes("3rd"));

                let titleToUse;
                let confirmMessage;

                if (isOccurrenceTask || isOccurrenceByTitle) {
                    titleToUse = freshTask.originalTitle || freshTask.title.split(" - ")[0];
                    confirmMessage = \`Are you sure you want to delete ALL occurrences of "\${titleToUse}" from \${selectedDate} forward?\\n\\nThis will delete all daily occurrences (1st, 2nd, 3rd, etc.) from today and all future dates.\`;
                } else {
                    titleToUse = freshTask.title;
                    confirmMessage = \`Are you sure you want to delete "\${titleToUse}" from \${selectedDate} forward?\\n\\nThis will affect all future occurrences.\`;
                }

                if (confirm(confirmMessage)) {
                    modal.remove();

                    if (isOccurrenceTask || isOccurrenceByTitle) {
                        await deleteAllOccurrencesFuture(titleToUse, selectedDate);
                    } else {
                        await deleteFutureOccurrences(titleToUse, selectedDate, freshTask.date.split(" to ")[0]);
                    }

                    loadTasksForDate(selectedDate);
                }
            } finally {
                deleteFutureBtn.disabled = false;
                deleteFutureBtn.textContent = originalText;
            }
        });
    }

    // Delete entire task (preserved from original tasks.html)
    const deleteEntireTaskBtn = modal.querySelector("#deleteEntireTaskBtn");
    if (deleteEntireTaskBtn) {
        deleteEntireTaskBtn.addEventListener("click", async () => {
            if (deleteEntireTaskBtn.disabled) return;
            deleteEntireTaskBtn.disabled = true;
            const originalText = deleteEntireTaskBtn.textContent;
            deleteEntireTaskBtn.textContent = "Deleting...";

            try {
                const isOccurrenceTask = freshTask.originalTitle && freshTask.totalOccurrences;
                const isOccurrenceByTitle = freshTask.title.includes(" - ") &&
                    (freshTask.title.includes("1st") || freshTask.title.includes("2nd") || freshTask.title.includes("3rd"));

                let titleToUse;
                let confirmMessage;

                if (isOccurrenceTask || isOccurrenceByTitle) {
                    titleToUse = freshTask.originalTitle || freshTask.title.split(" - ")[0];
                    confirmMessage = \`Are you sure you want to delete ALL occurrences of "\${titleToUse}"?\\n\\nThis will delete all daily occurrences (1st, 2nd, 3rd, etc.) across all past and future dates.\`;
                } else {
                    titleToUse = freshTask.title;
                    confirmMessage = \`Are you sure you want to delete "\${titleToUse}"?\\n\\nThis will delete the entire task and affect all past and future occurrences.\`;
                }

                if (confirm(confirmMessage)) {
                    modal.remove();

                    if (isOccurrenceTask || isOccurrenceByTitle) {
                        await deleteAllOccurrences(titleToUse, freshTask.date);
                    } else {
                        await deleteTaskFromBackend(titleToUse, freshTask.date);
                    }

                    loadTasksForDate(selectedDate);
                }
            } finally {
                deleteEntireTaskBtn.disabled = false;
                deleteEntireTaskBtn.textContent = originalText;
            }
        });
    }`;

    // Replace the comment with the actual handlers
    const replacementPattern = /\/\/\s*Add other edit and delete button handlers here.*?\n.*?\[Additional button handlers would be inserted here - truncated for space\]/s;

    if (replacementPattern.test(tasksContent)) {
        tasksContent = tasksContent.replace(replacementPattern, adminHandlers);
        console.log('✅ Replaced placeholder comment with complete admin handlers');
    } else {
        // Try alternative replacement
        const altPattern = /\/\/\s*Add other edit and delete button handlers here.*$/m;
        if (altPattern.test(tasksContent)) {
            tasksContent = tasksContent.replace(altPattern, adminHandlers);
            console.log('✅ Added admin handlers after comment');
        } else {
            console.log('❌ Could not find suitable replacement point');
            process.exit(1);
        }
    }

    // Create a backup
    const backupPath = tasksHtmlPath + '.backup-admin-handlers.' + Date.now();
    fs.writeFileSync(backupPath, fs.readFileSync(tasksHtmlPath, 'utf8'));
    console.log(`✅ Created backup at ${backupPath}`);

    // Write the updated content
    fs.writeFileSync(tasksHtmlPath, tasksContent);
    console.log('✅ Added all missing admin button event handlers');

    // Verify the fix
    const verifyContent = fs.readFileSync(tasksHtmlPath, 'utf8');
    const hasEditFuture = verifyContent.includes('editFutureBtn.addEventListener');
    const hasEditTask = verifyContent.includes('editTaskBtn.addEventListener');
    const hasDeleteOccurrence = verifyContent.includes('deleteOccurrenceBtn.addEventListener');
    const hasDeleteFuture = verifyContent.includes('deleteFutureBtn.addEventListener');
    const hasDeleteEntire = verifyContent.includes('deleteEntireTaskBtn.addEventListener');

    console.log('\n🔍 Verification:');
    console.log(`   ✅ Edit Future handler: ${hasEditFuture}`);
    console.log(`   ✅ Edit Entire Task handler: ${hasEditTask}`);
    console.log(`   ✅ Delete This Day handler: ${hasDeleteOccurrence}`);
    console.log(`   ✅ Delete Future handler: ${hasDeleteFuture}`);
    console.log(`   ✅ Delete Entire Task handler: ${hasDeleteEntire}`);

    const allHandlersPresent = hasEditFuture && hasEditTask && hasDeleteOccurrence && hasDeleteFuture && hasDeleteEntire;

    if (allHandlersPresent) {
        console.log('\n🎉 All admin button handlers added successfully!');
        console.log('📋 Summary:');
        console.log('   ✓ Edit Future - Modify from selected date forward');
        console.log('   ✓ Edit Entire Task - Complete task modification');
        console.log('   ✓ Delete This Day - Remove single occurrence');
        console.log('   ✓ Delete Future - Delete from selected date forward');
        console.log('   ✓ Delete Entire Task - Remove complete task');
        console.log('\n🚀 All admin buttons should now work correctly!');
    } else {
        console.log('\n❌ Some handlers may not have been added correctly');
        console.log('💡 You may need to check the function manually');
    }

} catch (error) {
    console.error('❌ Error adding admin handlers:', error.message);
    process.exit(1);
}
