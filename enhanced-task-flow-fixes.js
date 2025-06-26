x// ENHANCED TASK FLOW FIXES - WITH MULTIPLE DAILY OCCURRENCES SUPPORT
// Comprehensive fix for task flow issues including support for multiple daily occurrences

console.log("🔧 Loading Enhanced Task Flow Fixes (with Multiple Daily Occurrences support)...");

/**
 * Enhanced task flow fixes that handle:
 * 1. Regular tasks
 * 2. Multiple daily occurrences (originalTitle + occurrence)
 * 3. Cross-completions
 * 4. Proper status display
 * 5. Avatar systems
 */

// Enhanced task assignment checking that handles both regular tasks and occurrences
function enhancedIsUserCurrentlyAssigned(task, selectedDate, userName) {
    console.log(`🔍 Enhanced assignment check for "${task.title}" - user: ${userName}`);

    // Check original assignments
    const isOriginallyAssigned = task.users.includes(userName);
    console.log(`   Original assignment: ${isOriginallyAssigned}`);

    // For rotation tasks with occurrences, check specific assignment
    if (task.settings && task.settings.includes('Rotation') && typeof task.currentTurnIndex !== 'undefined') {
        const currentAssignee = getCurrentAssignee(task, selectedDate, task.currentTurnIndex);
        console.log(`   Rotation task - current assignee: ${currentAssignee}`);
        return currentAssignee === userName;
    }

    // Check temporary replacements
    let isReplacementAssigned = false;
    if (task.tempTurnReplacement && task.tempTurnReplacement[selectedDate]) {
        const replacements = task.tempTurnReplacement[selectedDate];
        isReplacementAssigned = Object.values(replacements).includes(userName);
        console.log(`   Replacement assigned: ${isReplacementAssigned}`);
    }

    if (isReplacementAssigned) return true;

    // Check if user was replaced
    if (isOriginallyAssigned && task.tempTurnReplacement && task.tempTurnReplacement[selectedDate]) {
        const userIndex = task.users.indexOf(userName);
        if (userIndex !== -1 && task.tempTurnReplacement[selectedDate][userIndex.toString()]) {
            console.log(`   User was replaced`);
            return false;
        }
    }

    // ENHANCED LOGIC: Handle both regular tasks and multiple daily occurrences
    if (isOriginallyAssigned) {
        console.log(`   User is originally assigned - checking completions...`);

        // Check if task has completions by others on user's behalf
        const hasCompletions = enhancedHasTaskCompletions(task, selectedDate);
        if (hasCompletions) {
            const completions = enhancedGetTaskCompletions(task, selectedDate);

            // Enhanced completion checking for occurrences
            const completedByOthers = completions.some(c => {
                // Check for direct cross-completion
                if (c.user !== userName && c.originalAssignee === userName) {
                    return true;
                }

                // Check for occurrence-based cross-completion
                if (task.originalTitle && task.occurrence) {
                    // For occurrences, check if someone else completed this specific occurrence
                    return c.user !== userName && isOccurrenceCompletionForUser(c, task, userName);
                }

                return false;
            });

            const completedByUser = completions.some(c => c.user === userName);

            console.log(`   Enhanced completions found: completedByUser=${completedByUser}, completedByOthers=${completedByOthers}`);

            if (completedByUser || completedByOthers) {
                console.log(`   ✅ Task should show in My Tasks (completed)`);
                return true;
            }
        }

        console.log(`   ✅ Task should show in My Tasks (originally assigned)`);
        return true;
    }

    console.log(`   ❌ Task should NOT show in My Tasks`);
    return false;
}

// Check if a completion is for a specific occurrence and user
function isOccurrenceCompletionForUser(completion, task, userName) {
    // If the completion has task-specific info, use it
    if (completion.taskTitle && completion.taskTitle === task.title) {
        return true;
    }

    // If the completion has original title info and it matches
    if (completion.originalTitle && task.originalTitle &&
        completion.originalTitle === task.originalTitle &&
        completion.occurrence === task.occurrence) {
        return true;
    }

    // Fallback: if it's a general completion for the original title
    if (task.originalTitle && completion.taskTitle &&
        completion.taskTitle.startsWith(task.originalTitle)) {
        return true;
    }

    return false;
}

// Enhanced task completion checking for both regular tasks and occurrences
function enhancedHasTaskCompletions(task, selectedDate) {
    // Check completedDates (primary completion storage)
    if (task.completedDates && task.completedDates[selectedDate] && task.completedDates[selectedDate].length > 0) {
        return true;
    }

    // Check completions (fallback storage)
    if (task.completions && task.completions[selectedDate] && task.completions[selectedDate].length > 0) {
        return true;
    }

    // For multiple daily occurrences, also check if this specific occurrence has completions
    if (task.originalTitle && task.occurrence) {
        // Check if there are completions that match this specific occurrence
        const allCompletions = [];

        if (task.completedDates && task.completedDates[selectedDate]) {
            allCompletions.push(...task.completedDates[selectedDate]);
        }

        if (task.completions && task.completions[selectedDate]) {
            allCompletions.push(...task.completions[selectedDate]);
        }

        return allCompletions.some(c =>
            c.taskTitle === task.title ||
            (c.originalTitle === task.originalTitle && c.occurrence === task.occurrence) ||
            (c.taskTitle && c.taskTitle.includes(task.originalTitle))
        );
    }

    return false;
}

// Enhanced task completion retrieval for both regular tasks and occurrences
function enhancedGetTaskCompletions(task, selectedDate) {
    const completions = [];

    // Get completions from completedDates
    if (task.completedDates && task.completedDates[selectedDate]) {
        completions.push(...task.completedDates[selectedDate]);
    }

    // Get completions from completions (fallback)
    if (task.completions && task.completions[selectedDate]) {
        completions.push(...task.completions[selectedDate]);
    }

    // For multiple daily occurrences, filter to only relevant completions
    if (task.originalTitle && task.occurrence) {
        return completions.filter(c => {
            // Exact match for this occurrence
            if (c.taskTitle === task.title) return true;

            // Match by original title and occurrence
            if (c.originalTitle === task.originalTitle && c.occurrence === task.occurrence) return true;

            // Match by original title (for cross-completions that might not have occurrence info)
            if (c.taskTitle && c.taskTitle.includes(task.originalTitle)) return true;

            // Match if completion is tagged for this specific task
            if (c.taskId && task.id && c.taskId === task.id) return true;

            return false;
        });
    }

    return completions;
}

// Enhanced task status calculation with support for occurrences
function enhancedCalculateTaskStatusForUser(task, selectedDate, userName) {
    console.log(`🔍 Enhanced status calculation for "${task.title}" - user: ${userName}`);

    if (task.originalTitle && task.occurrence) {
        console.log(`   Multiple daily occurrence detected: ${task.originalTitle} - occurrence ${task.occurrence}`);
    }

    const completions = enhancedGetTaskCompletions(task, selectedDate);
    console.log(`   Found ${completions.length} enhanced completions:`, completions);

    if (completions.length === 0) {
        console.log(`   Status: INCOMPLETE (no completions)`);
        return 'incomplete';
    }

    // Check if user completed the task/occurrence themselves
    const userCompletions = completions.filter(c => c.user === userName);

    // Check if others completed it on user's behalf
    const crossCompletions = completions.filter(c => {
        // Direct cross-completion check
        if (c.user !== userName && c.originalAssignee === userName) {
            return true;
        }

        // For occurrences, check if it's cross-completion for this specific occurrence
        if (task.originalTitle && task.occurrence) {
            return c.user !== userName && isOccurrenceCompletionForUser(c, task, userName);
        }

        return false;
    });

    console.log(`   User completions: ${userCompletions.length}`);
    console.log(`   Cross completions (for user): ${crossCompletions.length}`);

    // Determine the relevant completions to check
    let relevantCompletions = [];
    if (userCompletions.length > 0) {
        relevantCompletions = userCompletions;
    } else if (crossCompletions.length > 0) {
        relevantCompletions = crossCompletions;
    }

    if (relevantCompletions.length === 0) {
        console.log(`   Status: INCOMPLETE (no relevant completions)`);
        return 'incomplete';
    }

    if (task.parentApproval === true) {
        const hasPending = relevantCompletions.some(c => c.isPending === true);
        const hasApproved = relevantCompletions.some(c => c.isPending === false);

        if (hasApproved && !hasPending) {
            console.log(`   Status: APPROVED (parent approved)`);
            return 'approved';
        }
        if (hasPending) {
            console.log(`   Status: PENDING (awaiting parent approval)`);
            return 'pending';
        }
        console.log(`   Status: INCOMPLETE (no clear approval status)`);
        return 'incomplete';
    } else {
        console.log(`   Status: APPROVED (no parent approval required)`);
        return 'approved';
    }
}

// Enhanced task display with support for occurrences
function enhancedCreateTaskDisplayWithCompletion(task, selectedDate, userName) {
    const completions = enhancedGetTaskCompletions(task, selectedDate);
    const userCompletions = completions.filter(c => c.user === userName);

    // Enhanced cross-completion detection for occurrences
    const crossCompletions = completions.filter(c => {
        // Direct cross-completion
        if (c.user !== userName && c.originalAssignee === userName) {
            return true;
        }

        // For occurrences, check if it's cross-completion for this specific occurrence
        if (task.originalTitle && task.occurrence) {
            return c.user !== userName && isOccurrenceCompletionForUser(c, task, userName);
        }

        return false;
    });

    let displayInfo = {
        showAvatar: false,
        avatarUser: null,
        showDoneButton: false,
        statusText: '',
        completerText: ''
    };

    const status = enhancedCalculateTaskStatusForUser(task, selectedDate, userName);

    // Determine what to show based on completion type
    if (userCompletions.length > 0) {
        // User completed their own task/occurrence
        displayInfo.showAvatar = true;
        displayInfo.avatarUser = userName;
        displayInfo.statusText = status === 'pending' ? 'Pending Approval' : 'Completed';
        displayInfo.completerText = 'Completed by you';

        console.log(`   Display: User completion - showing ${userName}'s avatar`);
    } else if (crossCompletions.length > 0) {
        // Someone else completed user's task/occurrence
        const crossCompletion = crossCompletions[0]; // Take first completion
        displayInfo.showAvatar = true;
        displayInfo.avatarUser = crossCompletion.user;
        displayInfo.statusText = status === 'pending' ? 'Pending Approval' : 'Completed';
        displayInfo.completerText = `Completed by ${crossCompletion.user}`;

        console.log(`   Display: Cross completion - showing ${crossCompletion.user}'s avatar`);
    } else {
        // Task/occurrence is incomplete - show Done button
        const todayStr = new Date().toLocaleDateString('sv-SE');
        const isToday = selectedDate === todayStr;

        if (isToday) {
            displayInfo.showDoneButton = true;
            displayInfo.statusText = 'Ready to complete';
        } else {
            displayInfo.statusText = 'Scheduled';
        }

        console.log(`   Display: Incomplete - showing Done button`);
    }

    return displayInfo;
}

// Enhanced finish task handler for occurrences
async function enhancedFinishTaskHandler(userName, task, selectedDate) {
    console.log(`🔧 Enhanced finish task handler: ${userName} completing "${task.title}"`);

    // For multiple daily occurrences, log additional info
    if (task.originalTitle && task.occurrence) {
        console.log(`   Multiple daily occurrence: ${task.originalTitle} - occurrence ${task.occurrence}/${task.totalOccurrences}`);
    }

    // Call the original finishTask function but with enhanced logging
    if (typeof window.originalFinishTask === 'function') {
        return await window.originalFinishTask(userName, task, selectedDate);
    } else {
        console.warn('⚠️ Original finishTask function not found');
        return await finishTask(userName, task, selectedDate);
    }
}

// Function to apply enhanced fixes
function applyEnhancedTaskFlowFixes() {
    console.log("🔧 Applying Enhanced Task Flow Fixes...");

    // Store original functions for potential rollback
    if (typeof window.isUserCurrentlyAssigned === 'function') {
        window.originalIsUserCurrentlyAssigned = window.isUserCurrentlyAssigned;
        window.isUserCurrentlyAssigned = enhancedIsUserCurrentlyAssigned;
        console.log("✅ Enhanced isUserCurrentlyAssigned function (with occurrence support)");
    }

    if (typeof window.finishTask === 'function') {
        window.originalFinishTask = window.finishTask;
        // Don't override finishTask directly, but provide enhanced handler
        console.log("✅ Enhanced finish task handler available");
    }

    // Add enhanced helper functions to window for global access
    window.enhancedCalculateTaskStatusForUser = enhancedCalculateTaskStatusForUser;
    window.enhancedCreateTaskDisplayWithCompletion = enhancedCreateTaskDisplayWithCompletion;
    window.enhancedHasTaskCompletions = enhancedHasTaskCompletions;
    window.enhancedGetTaskCompletions = enhancedGetTaskCompletions;
    window.enhancedFinishTaskHandler = enhancedFinishTaskHandler;
    window.isOccurrenceCompletionForUser = isOccurrenceCompletionForUser;

    // Enhanced CSS for task status styling
    if (!document.getElementById("enhancedTaskFlowFixesStyles")) {
        const style = document.createElement('style');
        style.id = "enhancedTaskFlowFixesStyles";
        style.textContent = `
            .task-incomplete {
                border-left: 4px solid #ff6b6b;
            }
            .task-pending {
                border-left: 4px solid #ffa500;
                background-color: #fff8e1;
            }
            .task-approved {
                border-left: 4px solid #4CAF50;
                background-color: #e8f5e8;
            }
            .task-occurrence {
                border-left: 4px solid #9C27B0;
                background-color: #f3e5f5;
            }
            .task-item .completer-text {
                font-size: 12px;
                color: #666;
                text-align: center;
                margin-top: 2px;
            }
            .task-item .occurrence-badge {
                background: #9C27B0;
                color: white;
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 10px;
                font-weight: bold;
                margin-left: 5px;
            }
            .avatar-container {
                position: relative;
            }
            .avatar-container img {
                transition: all 0.2s ease;
            }
            .avatar-container:hover img {
                transform: scale(1.05);
            }
            .task-item.occurrence-task {
                position: relative;
            }
            .task-item.occurrence-task::before {
                content: '⚡';
                position: absolute;
                top: 5px;
                right: 5px;
                font-size: 12px;
                color: #9C27B0;
            }
        `;
        document.head.appendChild(style);
    }

    console.log("✅ Enhanced Task Flow Fixes Applied Successfully!");
    console.log("📋 Enhanced Features:");
    console.log("   1. Support for multiple daily occurrences");
    console.log("   2. Enhanced cross-completion detection");
    console.log("   3. Improved avatar display for occurrences");
    console.log("   4. Better status calculation for occurrence tasks");
    console.log("   5. Occurrence-specific styling and badges");
}

// Auto-apply enhanced fixes when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyEnhancedTaskFlowFixes);
} else {
    applyEnhancedTaskFlowFixes();
}

// Export enhanced functions for testing
window.EnhancedTaskFlowFixes = {
    applyEnhancedTaskFlowFixes,
    enhancedIsUserCurrentlyAssigned,
    enhancedCalculateTaskStatusForUser,
    enhancedCreateTaskDisplayWithCompletion,
    enhancedHasTaskCompletions,
    enhancedGetTaskCompletions,
    isOccurrenceCompletionForUser
};

console.log("🔧 Enhanced Task Flow Issues Fix loaded and ready (with Multiple Daily Occurrences support)!");
