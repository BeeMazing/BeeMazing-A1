/**
 * Predicted Schedule Display System for BeeMazing Fair Rotation
 *
 * This system separates DISPLAY logic from RECALCULATION logic:
 * - Display shows the current predicted schedule (calculated once)
 * - Recalculation only happens when tasks are actually completed
 * - Users see consistent assignments until someone completes a task
 */

/**
 * Get the predicted assignment for a task on a specific date
 * This is what should be DISPLAYED to users
 *
 * @param {Object} task - The task object
 * @param {string} selectedDate - Date in YYYY-MM-DD format
 * @param {number} occurrenceIndex - Which occurrence (0-based)
 * @returns {Object} Assignment info for display
 */
function getPredictedAssignment(task, selectedDate, occurrenceIndex = 0) {
  console.log(
    `📅 Getting predicted assignment for ${task.title} on ${selectedDate}, occurrence ${occurrenceIndex}`,
  );

  // For non-fair rotation tasks, use the existing logic
  if (!task.fairRotation) {
    return getRegularRotationAssignment(task, selectedDate, occurrenceIndex);
  }

  // For fair rotation tasks, use the same global occurrence logic as regular rotation
  // This ensures continuous sequence across days
  console.log(
    `🔄 Using global occurrence logic for fair rotation: ${task.title}`,
  );

  // Calculate global occurrence number using the same method as regular rotation
  const globalOccurrence = calculateGlobalOccurrenceNumber(
    task,
    selectedDate,
    occurrenceIndex,
  );
  const userIndex = (globalOccurrence - 1) % task.users.length;
  const assignedUser = task.users[userIndex];

  console.log(
    `🎯 Fair rotation assignment: Global ${globalOccurrence} → ${assignedUser} (index ${userIndex})`,
  );

  return {
    user: assignedUser,
    originalUser: assignedUser,
    isPredicted: true,
    source: "global-occurrence-continuous",
    globalOccurrence: globalOccurrence,
  };
}

/**
 * Generate predicted schedule for fair rotation task
 * This creates the schedule that users will see until recalculation is needed
 *
 * @param {Object} task - The task object
 * @param {string} startDate - Starting date for schedule generation
 * @param {number} days - Number of days to generate (default 30)
 */
function generatePredictedSchedule(task, startDate, days = 30) {
  if (!task.fairRotation) {
    console.log(
      `⏭️ Skipping predicted schedule for non-fair rotation task: ${task.title}`,
    );
    return;
  }

  console.log(
    `🔮 Generating predicted schedule for ${task.title} starting ${startDate}`,
  );

  // Use the existing calculateFairRotationSchedule function
  if (typeof calculateFairRotationSchedule === "function") {
    const newSchedule = calculateFairRotationSchedule(task, startDate, days);

    // Initialize or update the task's predicted schedule
    if (!task.fairRotationSchedule) {
      task.fairRotationSchedule = {};
    }

    // Merge new schedule with existing (don't overwrite past assignments)
    Object.assign(task.fairRotationSchedule, newSchedule);

    console.log(
      `✅ Generated predicted schedule for ${Object.keys(newSchedule).length} days`,
    );
    return newSchedule;
  } else {
    console.error("❌ calculateFairRotationSchedule function not available");
    return {};
  }
}

/**
 * Check if a task needs schedule recalculation
 * This should only happen when tasks are actually completed
 *
 * @param {Object} task - The task object
 * @param {string} date - Date when task was completed
 * @param {string} completingUser - User who completed the task
 * @returns {boolean} Whether recalculation is needed
 */
function needsScheduleRecalculation(task, date, completingUser) {
  if (!task.fairRotation) {
    return false; // Non-fair rotation tasks don't need recalculation
  }

  // Fair rotation always needs recalculation after completion
  console.log(
    `🔄 Fair rotation task completed by ${completingUser} on ${date} - recalculation needed`,
  );
  return true;
}

/**
 * Trigger schedule recalculation for fair rotation tasks
 * This should only be called when a task is actually completed
 *
 * @param {Object} task - The task object
 * @param {string} fromDate - Date to recalculate from
 * @param {string} reason - Reason for recalculation (for logging)
 */
function triggerScheduleRecalculation(
  task,
  fromDate,
  reason = "task completed",
) {
  if (!task.fairRotation) {
    console.log(
      `⏭️ Skipping recalculation for non-fair rotation task: ${task.title}`,
    );
    return;
  }

  console.log(
    `🔄 Triggering schedule recalculation for ${task.title} from ${fromDate} (${reason})`,
  );

  // Mark that recalculation is needed
  if (!task.fairRotationRecalculationNeeded) {
    task.fairRotationRecalculationNeeded = {};
  }
  task.fairRotationRecalculationNeeded[fromDate] = true;

  // Generate new predicted schedule from the completion date forward
  generatePredictedSchedule(task, fromDate, 30);

  console.log(`✅ Schedule recalculated for ${task.title}`);
}

/**
 * Get assignment for regular (non-fair) rotation tasks
 * Uses the existing scheduled assignment logic
 *
 * @param {Object} task - The task object
 * @param {string} selectedDate - Date in YYYY-MM-DD format
 * @param {number} occurrenceIndex - Which occurrence (0-based)
 * @returns {Object} Assignment info
 */
function getRegularRotationAssignment(task, selectedDate, occurrenceIndex = 0) {
  if (typeof calculateScheduledAssignment === "function") {
    const assignedUser = calculateScheduledAssignment(
      task,
      selectedDate,
      occurrenceIndex,
    );
    return {
      user: assignedUser,
      originalUser: assignedUser,
      isPredicted: false,
      source: "scheduled-assignment",
    };
  }

  // Fallback to simple rotation using global occurrence logic
  const globalOccurrence = calculateGlobalOccurrenceNumber(
    task,
    selectedDate,
    occurrenceIndex,
  );
  const userIndex = (globalOccurrence - 1) % task.users.length;
  const assignedUser = task.users[userIndex];

  return {
    user: assignedUser,
    originalUser: assignedUser,
    isPredicted: false,
    source: "simple-rotation",
    globalOccurrence: globalOccurrence,
  };
}

/**
 * Get live fair rotation assignment (fallback only)
 * This should only be used as a last resort
 *
 * @param {Object} task - The task object
 * @param {string} selectedDate - Date in YYYY-MM-DD format
 * @param {number} occurrenceIndex - Which occurrence (0-based)
 * @returns {Object} Assignment info
 */
function getLiveFairRotationAssignment(
  task,
  selectedDate,
  occurrenceIndex = 0,
) {
  console.warn(
    `⚠️ Using live fair rotation calculation for ${task.title} - this should be rare`,
  );

  if (typeof fairRotationTurnData === "function") {
    const turnData = fairRotationTurnData(task, selectedDate);
    if (turnData.turns && turnData.turns[occurrenceIndex]) {
      const turn = turnData.turns[occurrenceIndex];
      return {
        user: turn.user,
        originalUser: turn.originalUser || turn.user,
        isPredicted: false,
        source: "live-calculation",
        isCompleted: turn.isCompleted,
        isPending: turn.isPending,
      };
    }
  }

  // Ultimate fallback
  const userIndex = occurrenceIndex % task.users.length;
  return {
    user: task.users[userIndex],
    originalUser: task.users[userIndex],
    isPredicted: false,
    source: "fallback",
  };
}

/**
 * Enhanced mixedTurnData that uses continuous global occurrence logic for fair rotation
 * This ensures fair rotation continues properly across days using the same logic as regular rotation
 *
 * @param {Object} task - The task object
 * @param {string} selectedDate - Date in YYYY-MM-DD format
 * @returns {Object} Turn data for display
 */
function mixedTurnDataWithPrediction(task, selectedDate) {
  try {
    if (!task || typeof task !== "object" || !Array.isArray(task.users)) {
      console.error("Invalid task input in mixedTurnDataWithPrediction:", task);
      return { turns: [], completedCount: 0, requiredTimes: 1 };
    }

    // Handle "As Needed" tasks which don't have dates
    if (task.asNeeded || task.repeat === "As Needed" || !task.date) {
      return { turns: [], completedCount: 0, requiredTimes: 1 };
    }

    const repeat = task.repeat || "Daily";
    const requiredTimes =
      repeat === "Monthly"
        ? Number.isInteger(task.timesPerMonth)
          ? task.timesPerMonth
          : 1
        : repeat === "Weekly"
          ? Number.isInteger(task.timesPerWeek)
            ? task.timesPerWeek
            : 1
          : repeat === "Daily"
            ? Number.isInteger(task.timesPerDay)
              ? task.timesPerDay
              : 1
            : 1;

    // Get completion data
    const completions = Array.isArray(task.completions?.[selectedDate])
      ? task.completions[selectedDate]
      : [];

    const turns = [];

    console.log(
      `🔄 Building fair rotation turns for ${task.title} on ${selectedDate} with ${requiredTimes} occurrences`,
    );

    // Build turns using global occurrence continuous logic (same as regular rotation)
    for (let i = 0; i < requiredTimes; i++) {
      // Calculate global occurrence number for continuous rotation across days
      const globalOccurrence = calculateGlobalOccurrenceNumber(
        task,
        selectedDate,
        i,
      );
      const userIndex = (globalOccurrence - 1) % task.users.length;
      const assignedUser = task.users[userIndex];

      console.log(
        `🎯 Occurrence ${i + 1}: Global ${globalOccurrence} → ${assignedUser} (index ${userIndex})`,
      );

      // Check if this occurrence is completed or pending
      let isCompleted = false;
      let isPending = false;
      let completionTime = null;

      // Find matching completion for this occurrence
      const matchingCompletion = completions.find(
        (c) =>
          c.user === assignedUser &&
          (c.occurrence === i + 1 || (!c.occurrence && i === 0)),
      );

      if (matchingCompletion) {
        if (matchingCompletion.isPending) {
          isPending = true;
        } else {
          isCompleted = true;
          completionTime = matchingCompletion.completionTime;
        }
      }

      turns.push({
        user: assignedUser,
        originalUser: assignedUser,
        repetition: i + 1,
        isCompleted,
        isPending,
        completionTime,
        index: i,
        globalOccurrence: globalOccurrence,
        isPredicted: true,
        source: "global-occurrence-continuous",
      });
    }

    const completedCount = completions.filter((c) => !c.isPending).length;

    console.log(
      `✅ Fair rotation turns built: ${turns.length} turns, ${completedCount} completed`,
    );

    return {
      turns,
      completedCount,
      requiredTimes,
      usedPredictedSchedule: true,
      usedGlobalOccurrence: true,
    };
  } catch (err) {
    console.error("Error in mixedTurnDataWithPrediction:", err);
    return { turns: [], completedCount: 0, requiredTimes: 1 };
  }
}

/**
 * Initialize predicted schedules for all fair rotation tasks
 * This should be called when the app loads or when new tasks are created
 *
 * @param {Array} tasks - Array of task objects
 * @param {string} fromDate - Date to start generating schedules from
 */
function initializePredictedSchedules(tasks, fromDate) {
  console.log(
    `🚀 Initializing predicted schedules for ${tasks.length} tasks from ${fromDate}`,
  );

  let fairRotationTaskCount = 0;

  tasks.forEach((task) => {
    if (task.fairRotation && task.settings?.includes("Rotation")) {
      generatePredictedSchedule(task, fromDate, 30);
      fairRotationTaskCount++;
    }
  });

  console.log(
    `✅ Initialized predicted schedules for ${fairRotationTaskCount} fair rotation tasks`,
  );
}

/**
 * Get debug info about a task's predicted schedule
 * Useful for troubleshooting
 *
 * @param {Object} task - The task object
 * @param {string} date - Date to check
 * @returns {Object} Debug information
 */
function getScheduleDebugInfo(task, date) {
  return {
    taskTitle: task.title,
    date: date,
    hasFairRotation: !!task.fairRotation,
    hasSchedule: !!(
      task.fairRotationSchedule && task.fairRotationSchedule[date]
    ),
    schedule: task.fairRotationSchedule?.[date] || null,
    needsRecalculation: !!(
      task.fairRotationRecalculationNeeded &&
      task.fairRotationRecalculationNeeded[date]
    ),
    completions: task.completions?.[date] || [],
    pendingCompletions: task.pendingCompletions?.[date] || [],
  };
}

// Export functions for use in other files
if (typeof window !== "undefined") {
  // Browser environment
  window.PredictedScheduleSystem = {
    getPredictedAssignment,
    generatePredictedSchedule,
    needsScheduleRecalculation,
    triggerScheduleRecalculation,
    mixedTurnDataWithPrediction,
    initializePredictedSchedules,
    getScheduleDebugInfo,
  };
} else if (typeof module !== "undefined" && module.exports) {
  // Node.js environment
  module.exports = {
    getPredictedAssignment,
    generatePredictedSchedule,
    needsScheduleRecalculation,
    triggerScheduleRecalculation,
    mixedTurnDataWithPrediction,
    initializePredictedSchedules,
    getScheduleDebugInfo,
  };
}
