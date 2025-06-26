/**
 * Enhanced Task Flow Fixes with Proper Occurrence Handling
 *
 * This script fixes task flow issues where completed tasks move incorrectly between
 * "My Tasks" and "All Tasks" sections, with special handling for multiple daily occurrences.
 *
 * Key Features:
 * - Proper handling of regular tasks vs multiple daily occurrences
 * - Cross-completion support (when someone else completes your task)
 * - Correct task assignment logic for occurrence-based tasks
 * - Enhanced status calculation for both task types
 * - Improved avatar and button display logic
 */

(function () {
  "use strict";

  console.log("🚀 Loading Enhanced Occurrence Task Flow Fixes...");

  /**
   * Enhanced function to check if a user is currently assigned to a task
   * Handles both regular tasks and multiple daily occurrences properly
   */
  function enhancedIsUserCurrentlyAssigned(task, selectedDate, userName) {
    console.log(
      `🔍 Enhanced assignment check for "${task.title}" - user: ${userName}`,
    );
    console.log(`   Task structure:`, {
      title: task.title,
      originalTitle: task.originalTitle,
      occurrence: task.occurrence,
      totalOccurrences: task.totalOccurrences,
      users: task.users,
    });

    // For multiple daily occurrences, check specific occurrence assignment
    if (task.originalTitle && task.occurrence && task.totalOccurrences) {
      console.log(
        `   🔄 Multiple daily occurrence detected: "${task.originalTitle}" - occurrence ${task.occurrence}/${task.totalOccurrences}`,
      );

      // For occurrences, the task.users array should contain only the assigned user(s)
      const isAssignedToOccurrence = task.users.includes(userName);
      console.log(`   Occurrence assignment: ${isAssignedToOccurrence}`);

      if (isAssignedToOccurrence) {
        console.log(`   ✅ User is assigned to this occurrence`);
        return true;
      } else {
        console.log(`   ❌ User is NOT assigned to this occurrence`);
        return false;
      }
    }

    // For regular tasks, check original assignment logic
    const isOriginallyAssigned = task.users.includes(userName);
    console.log(
      `   📝 Regular task - original assignment: ${isOriginallyAssigned}`,
    );

    // Check for rotation tasks with turn index
    if (
      task.settings &&
      task.settings.includes("Rotation") &&
      typeof task.currentTurnIndex !== "undefined"
    ) {
      const currentAssignee = getCurrentAssignee(
        task,
        selectedDate,
        task.currentTurnIndex,
      );
      console.log(`   🔄 Rotation task - current assignee: ${currentAssignee}`);
      return currentAssignee === userName;
    }

    // Check temporary replacements
    if (task.tempTurnReplacement && task.tempTurnReplacement[selectedDate]) {
      const replacements = task.tempTurnReplacement[selectedDate];
      const isReplacementAssigned =
        Object.values(replacements).includes(userName);

      if (isReplacementAssigned) {
        console.log(`   🔄 User is assigned as replacement`);
        return true;
      }

      // Check if user was replaced
      if (isOriginallyAssigned) {
        const userIndex = task.users.indexOf(userName);
        if (
          userIndex !== -1 &&
          task.tempTurnReplacement[selectedDate][userIndex.toString()]
        ) {
          console.log(`   🔄 User was replaced`);
          return false;
        }
      }
    }

    if (isOriginallyAssigned) {
      console.log(`   ✅ User is originally assigned to regular task`);
      return true;
    }

    console.log(`   ❌ User is NOT assigned to this task`);
    return false;
  }

  /**
   * Check if a completion record matches a specific task occurrence
   */
  function isCompletionForTaskOccurrence(completion, task, userName) {
    console.log(`🔍 Matching completion for task "${task.title}":`, {
      completion: completion,
      taskHasOccurrence: !!(task.originalTitle && task.occurrence),
    });

    // For regular tasks (no occurrence)
    if (!task.originalTitle && !task.occurrence) {
      // Match if completion is for this exact task title OR if completion has no taskTitle (from completedDates)
      const matches =
        completion.taskTitle === task.title ||
        completion.taskTitle === undefined ||
        completion.taskTitle === null ||
        completion.taskTitle === "";
      console.log(
        `📝 Regular task match: ${matches} (taskTitle: "${completion.taskTitle}" vs "${task.title}", hasTaskTitle: ${!!completion.taskTitle})`,
      );
      return matches;
    }

    // For multiple daily occurrences
    if (task.originalTitle && task.occurrence) {
      // Check if completion has exact task title match
      if (completion.taskTitle === task.title) {
        console.log(
          `✅ Exact title match: "${completion.taskTitle}" === "${task.title}"`,
        );
        return true;
      }

      // Check if completion has occurrence-specific data
      if (
        completion.originalTitle === task.originalTitle &&
        completion.occurrence === task.occurrence
      ) {
        console.log(
          `✅ Occurrence data match: "${completion.originalTitle}" === "${task.originalTitle}" && ${completion.occurrence} === ${task.occurrence}`,
        );
        return true;
      }

      // Check if completion has task ID match (if available)
      if (completion.taskId && task.id && completion.taskId === task.id) {
        console.log(
          `✅ Task ID match: "${completion.taskId}" === "${task.id}"`,
        );
        return true;
      }

      // Fallback: check if completion title starts with original title
      if (
        completion.taskTitle &&
        completion.taskTitle.startsWith(task.originalTitle)
      ) {
        // Make sure it's the right occurrence
        const occurrenceSuffix = ` - ${task.occurrence}`;
        const matches = completion.taskTitle.includes(occurrenceSuffix);
        console.log(
          `✅ Fallback match: "${completion.taskTitle}" starts with "${task.originalTitle}" and includes "${occurrenceSuffix}": ${matches}`,
        );
        return matches;
      }

      console.log(`❌ No occurrence match found`);
    }

    console.log(`❌ No match found`);
    return false;
  }

  /**
   * Enhanced function to get task completions with occurrence awareness
   */
  function enhancedGetTaskCompletions(task, selectedDate) {
    const completions = [];

    // Check completedDates structure
    if (task.completedDates && task.completedDates[selectedDate]) {
      const dateCompletions = task.completedDates[selectedDate];

      if (Array.isArray(dateCompletions)) {
        completions.push(...dateCompletions);
      } else if (typeof dateCompletions === "object") {
        // Handle object-based completions
        Object.values(dateCompletions).forEach((completion) => {
          if (completion && typeof completion === "object") {
            completions.push(completion);
          }
        });
      }
    }

    // Check completions array
    if (task.completions && Array.isArray(task.completions)) {
      const relevantCompletions = task.completions.filter(
        (c) =>
          c.date === selectedDate &&
          isCompletionForTaskOccurrence(c, task, null),
      );
      completions.push(...relevantCompletions);
    }

    // Filter out duplicates and ensure each completion has required fields
    const uniqueCompletions = completions.filter((completion, index, arr) => {
      // Remove duplicates based on user and timestamp
      const isDuplicate =
        arr.findIndex(
          (c) =>
            c.user === completion.user && c.timestamp === completion.timestamp,
        ) !== index;

      return !isDuplicate && completion.user; // Ensure completion has user
    });

    console.log(
      `   📋 Found ${uniqueCompletions.length} completions for task "${task.title}" on ${selectedDate}:`,
      uniqueCompletions,
    );
    return uniqueCompletions;
  }

  /**
   * Enhanced function to check if task has completions
   */
  function enhancedHasTaskCompletions(task, selectedDate) {
    const completions = enhancedGetTaskCompletions(task, selectedDate);
    return completions.length > 0;
  }

  /**
   * Enhanced status calculation with proper occurrence handling
   */
  function enhancedCalculateTaskStatusForUser(task, selectedDate, userName) {
    console.log(
      `🔍 Enhanced status calculation for "${task.title}" - user: ${userName}`,
    );

    if (task.originalTitle && task.occurrence) {
      console.log(
        `   🔄 Multiple daily occurrence: "${task.originalTitle}" - occurrence ${task.occurrence}/${task.totalOccurrences}`,
      );
    }

    const completions = enhancedGetTaskCompletions(task, selectedDate);

    if (completions.length === 0) {
      console.log(`   📊 Status: INCOMPLETE (no completions)`);
      return "incomplete";
    }

    // For occurrence tasks, only consider completions that match this specific task
    const relevantCompletions = completions.filter((c) =>
      isCompletionForTaskOccurrence(c, task, userName),
    );

    console.log(
      `   📊 Relevant completions for this task/occurrence: ${relevantCompletions.length}`,
    );

    if (relevantCompletions.length === 0) {
      console.log(`   📊 Status: INCOMPLETE (no relevant completions)`);
      return "incomplete";
    }

    // Check if user is assigned to this task/occurrence
    const isUserAssigned = enhancedIsUserCurrentlyAssigned(
      task,
      selectedDate,
      userName,
    );

    // Check user's own completions
    const userCompletions = relevantCompletions.filter(
      (c) => c.user === userName,
    );

    // Check cross-completions (others completing on user's behalf)
    const crossCompletions = relevantCompletions.filter(
      (c) => c.user !== userName && c.originalAssignee === userName,
    );

    console.log(
      `   📊 User completions: ${userCompletions.length}, Cross completions: ${crossCompletions.length}`,
    );

    // For users not assigned to this task/occurrence, they should always be incomplete
    if (!isUserAssigned) {
      console.log(`   📊 Status: INCOMPLETE (user not assigned to this task)`);
      return "incomplete";
    }

    // For assigned users, determine which completions to use for status
    let statusCompletions = [];
    if (userCompletions.length > 0) {
      statusCompletions = userCompletions;
    } else if (crossCompletions.length > 0) {
      statusCompletions = crossCompletions;
    }

    if (statusCompletions.length === 0) {
      console.log(`   📊 Status: INCOMPLETE (no status-relevant completions)`);
      return "incomplete";
    }

    // Handle parent approval logic
    if (task.parentApproval === true) {
      const hasPending = statusCompletions.some((c) => c.isPending === true);
      const hasApproved = statusCompletions.some((c) => c.isPending === false);

      if (hasApproved && !hasPending) {
        console.log(`   📊 Status: APPROVED (parent approved)`);
        return "approved";
      }
      if (hasPending) {
        console.log(`   📊 Status: PENDING (awaiting parent approval)`);
        return "pending";
      }

      console.log(
        `   📊 Status: INCOMPLETE (completion exists but no clear approval)`,
      );
      return "incomplete";
    } else {
      console.log(`   📊 Status: APPROVED (no parent approval required)`);
      return "approved";
    }
  }

  /**
   * Enhanced task display creation with occurrence awareness
   */
  function enhancedCreateTaskDisplayWithCompletion(
    task,
    selectedDate,
    userName,
  ) {
    console.log(
      `🎨 Creating enhanced display for "${task.title}" - user: ${userName}`,
    );

    const completions = enhancedGetTaskCompletions(task, selectedDate);
    const relevantCompletions = completions.filter((c) =>
      isCompletionForTaskOccurrence(c, task, userName),
    );

    // Check user's own completions
    const userCompletions = relevantCompletions.filter(
      (c) => c.user === userName,
    );

    // Check cross-completions
    const crossCompletions = relevantCompletions.filter(
      (c) => c.user !== userName && c.originalAssignee === userName,
    );

    if (userCompletions.length > 0) {
      // User completed their own task/occurrence
      const completion = userCompletions[0];
      console.log(`   🎨 Display: User's own completion`);

      return {
        showAvatar: true,
        avatarUser: userName,
        completerText: "Completed by you",
        completionData: completion,
        showDoneButton: false,
      };
    } else if (crossCompletions.length > 0) {
      // Someone else completed user's task/occurrence
      const crossCompletion = crossCompletions[0];
      console.log(`   🎨 Display: Cross-completion by ${crossCompletion.user}`);

      return {
        showAvatar: true,
        avatarUser: crossCompletion.user,
        completerText: `Completed by ${crossCompletion.user}`,
        completionData: crossCompletion,
        showDoneButton: false,
      };
    } else {
      // Task/occurrence is incomplete - show Done button
      console.log(`   🎨 Display: Incomplete - showing Done button`);

      return {
        showDoneButton: true,
        statusText: "Ready to complete",
        showAvatar: false,
      };
    }
  }

  /**
   * Enhanced finish task handler with occurrence support
   */
  async function enhancedFinishTaskHandler(taskId, selectedDate, userName) {
    console.log(
      `🏁 Enhanced finish task handler - Task ID: ${taskId}, Date: ${selectedDate}, User: ${userName}`,
    );

    try {
      // Find the task
      const task = window.allTasks?.find((t) => t.id === taskId);
      if (!task) {
        console.error(`❌ Task not found: ${taskId}`);
        return false;
      }

      console.log(`   🏁 Processing task: "${task.title}"`);
      if (task.originalTitle && task.occurrence) {
        console.log(
          `   🏁 Occurrence task: "${task.originalTitle}" - occurrence ${task.occurrence}/${task.totalOccurrences}`,
        );
      }

      // Create completion record with occurrence awareness
      const completionRecord = {
        user: userName,
        date: selectedDate,
        timestamp: new Date().toISOString(),
        isPending: task.parentApproval === true,
        taskTitle: task.title,
        taskId: task.id,
      };

      // Add occurrence-specific data if applicable
      if (task.originalTitle && task.occurrence) {
        completionRecord.originalTitle = task.originalTitle;
        completionRecord.occurrence = task.occurrence;
        completionRecord.totalOccurrences = task.totalOccurrences;
      }

      // For cross-completions, record the original assignee
      if (!enhancedIsUserCurrentlyAssigned(task, selectedDate, userName)) {
        const originalAssignees = task.users;
        if (originalAssignees.length > 0) {
          completionRecord.originalAssignee = originalAssignees[0]; // For occurrences, should be single user
        }
      }

      console.log(`   🏁 Completion record:`, completionRecord);

      // Call existing finish task logic with enhanced record
      if (window.finishTask) {
        const result = await window.finishTask(
          taskId,
          selectedDate,
          completionRecord,
        );
        console.log(`   🏁 Enhanced finish task result:`, result);
        return result;
      } else {
        console.error(`❌ Original finishTask function not found`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Enhanced finish task error:`, error);
      return false;
    }
  }

  /**
   * Apply all enhanced task flow fixes
   */
  function applyEnhancedOccurrenceTaskFlowFixes() {
    console.log("🔧 Applying Enhanced Occurrence Task Flow Fixes...");

    // Store originals if not already stored
    if (!window.originalIsUserCurrentlyAssigned) {
      window.originalIsUserCurrentlyAssigned = window.isUserCurrentlyAssigned;
    }
    if (!window.originalHasTaskCompletions) {
      window.originalHasTaskCompletions = window.hasTaskCompletions;
    }
    if (!window.originalGetTaskCompletions) {
      window.originalGetTaskCompletions = window.getTaskCompletions;
    }
    if (!window.originalCalculateTaskStatusForUser) {
      window.originalCalculateTaskStatusForUser =
        window.calculateTaskStatusForUser;
    }
    if (!window.originalCreateTaskDisplayWithCompletion) {
      window.originalCreateTaskDisplayWithCompletion =
        window.createTaskDisplayWithCompletion;
    }
    if (!window.originalFinishTask) {
      window.originalFinishTask = window.finishTask;
    }

    // Apply enhanced functions
    window.isUserCurrentlyAssigned = enhancedIsUserCurrentlyAssigned;
    window.hasTaskCompletions = enhancedHasTaskCompletions;
    window.getTaskCompletions = enhancedGetTaskCompletions;
    window.calculateTaskStatusForUser = enhancedCalculateTaskStatusForUser;
    window.createTaskDisplayWithCompletion =
      enhancedCreateTaskDisplayWithCompletion;
    window.enhancedCreateTaskDisplayWithCompletion =
      enhancedCreateTaskDisplayWithCompletion;

    // Create enhanced finish task wrapper
    const originalFinishTask = window.finishTask;
    window.finishTask = async function (taskId, selectedDate, userName) {
      return await enhancedFinishTaskHandler(taskId, selectedDate, userName);
    };

    // Add enhanced helper functions to global scope
    window.isCompletionForTaskOccurrence = isCompletionForTaskOccurrence;
    window.enhancedGetTaskCompletions = enhancedGetTaskCompletions;
    window.enhancedIsUserCurrentlyAssigned = enhancedIsUserCurrentlyAssigned;
    window.enhancedCalculateTaskStatusForUser =
      enhancedCalculateTaskStatusForUser;

    // Add CSS for enhanced styling
    const style = document.createElement("style");
    style.textContent = `
            /* Enhanced styling for occurrence tasks */
            .task-card[data-occurrence] {
                border-left: 3px solid #2196F3;
            }

            .task-card[data-occurrence]::before {
                content: '(' attr(data-occurrence) '/' attr(data-total-occurrences) ')';
                position: absolute;
                top: 8px;
                right: 8px;
                background: #2196F3;
                color: white;
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 10px;
                font-weight: bold;
            }

            .occurrence-indicator {
                display: inline-block;
                background: #2196F3;
                color: white;
                font-size: 11px;
                padding: 2px 6px;
                border-radius: 10px;
                margin-left: 8px;
                font-weight: bold;
            }

            .cross-completion-indicator {
                background: #FF9800;
                color: white;
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 8px;
                margin-left: 4px;
            }

            .enhanced-task-flow-fixes-applied {
                background: #4CAF50 !important;
                color: white !important;
            }
        `;
    document.head.appendChild(style);

    console.log("✅ Enhanced Occurrence Task Flow Fixes Applied Successfully!");
    console.log("📋 Enhanced functions available:");
    console.log("   - enhancedIsUserCurrentlyAssigned()");
    console.log("   - enhancedGetTaskCompletions()");
    console.log("   - enhancedCalculateTaskStatusForUser()");
    console.log("   - enhancedCreateTaskDisplayWithCompletion()");
    console.log("   - isCompletionForTaskOccurrence()");

    // Create global object for easy access
    window.EnhancedOccurrenceTaskFlowFixes = {
      version: "2.0.0",
      applied: true,
      enhancedIsUserCurrentlyAssigned,
      enhancedGetTaskCompletions,
      enhancedHasTaskCompletions,
      enhancedCalculateTaskStatusForUser,
      enhancedCreateTaskDisplayWithCompletion,
      isCompletionForTaskOccurrence,
      enhancedFinishTaskHandler,
    };

    return true;
  }

  /**
   * Rollback function to restore original functions
   */
  function rollbackEnhancedOccurrenceTaskFlowFixes() {
    console.log("⏪ Rolling back Enhanced Occurrence Task Flow Fixes...");

    if (window.originalIsUserCurrentlyAssigned) {
      window.isUserCurrentlyAssigned = window.originalIsUserCurrentlyAssigned;
    }
    if (window.originalHasTaskCompletions) {
      window.hasTaskCompletions = window.originalHasTaskCompletions;
    }
    if (window.originalGetTaskCompletions) {
      window.getTaskCompletions = window.originalGetTaskCompletions;
    }
    if (window.originalCalculateTaskStatusForUser) {
      window.calculateTaskStatusForUser =
        window.originalCalculateTaskStatusForUser;
    }
    if (window.originalCreateTaskDisplayWithCompletion) {
      window.createTaskDisplayWithCompletion =
        window.originalCreateTaskDisplayWithCompletion;
    }
    if (window.originalFinishTask) {
      window.finishTask = window.originalFinishTask;
    }

    if (window.EnhancedOccurrenceTaskFlowFixes) {
      window.EnhancedOccurrenceTaskFlowFixes.applied = false;
    }

    console.log("✅ Enhanced Occurrence Task Flow Fixes Rolled Back");
  }

  // Auto-apply fixes when script loads
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      applyEnhancedOccurrenceTaskFlowFixes,
    );
  } else {
    applyEnhancedOccurrenceTaskFlowFixes();
  }

  // Export functions for manual control
  window.applyEnhancedOccurrenceTaskFlowFixes =
    applyEnhancedOccurrenceTaskFlowFixes;
  window.rollbackEnhancedOccurrenceTaskFlowFixes =
    rollbackEnhancedOccurrenceTaskFlowFixes;
})();
