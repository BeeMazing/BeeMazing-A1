// Rotation Logic Helper Functions
// This module handles the logic for when rotation should advance based on task settings

/**
 * Determines if rotation should advance based on rotation settings
 * @param {Object} task - The task object
 * @param {string} selectedDate - The date in YYYY-MM-DD format
 * @param {string} completingUser - The user who just completed the task
 * @param {Object} completions - Task completions data
 * @param {Object} pendingCompletions - Task pending completions data
 * @returns {Object} - { shouldAdvance: boolean, reason: string }
 */
function shouldAdvanceRotation(
  task,
  selectedDate,
  completingUser,
  completions,
  pendingCompletions,
) {
  try {
    // If not a rotation task, don't advance
    if (!task.settings?.includes("Rotation")) {
      return { shouldAdvance: false, reason: "Not a rotation task" };
    }

    // If no rotation settings, use legacy behavior (advance after completion)
    if (!task.rotationSettings) {
      return {
        shouldAdvance: true,
        reason: "Legacy rotation - advance after completion",
      };
    }

    const rotationSettings = task.rotationSettings;
    const rotationType = rotationSettings.type;

    switch (rotationType) {
      case "completion":
        // Advance immediately after current user completes
        return {
          shouldAdvance: true,
          reason: "Completion-based rotation - advance after user completes",
        };

      case "occurrences":
        // Advance after X occurrences by current user
        return checkOccurrenceBasedRotation(
          task,
          selectedDate,
          completingUser,
          completions,
          pendingCompletions,
          rotationSettings,
        );

      case "time":
        // Advance after X days/weeks since last rotation
        return checkTimeBasedRotation(task, selectedDate, rotationSettings);

      default:
        console.warn(
          `Unknown rotation type: ${rotationType}, using default behavior`,
        );
        return {
          shouldAdvance: true,
          reason: "Unknown rotation type - using default",
        };
    }
  } catch (error) {
    console.error("Error in shouldAdvanceRotation:", error);
    return {
      shouldAdvance: true,
      reason: "Error occurred - using default behavior",
    };
  }
}

/**
 * Check if rotation should advance based on occurrence count
 * @param {Object} task - The task object
 * @param {string} selectedDate - The date in YYYY-MM-DD format
 * @param {string} completingUser - The user who just completed the task
 * @param {Object} completions - Task completions data
 * @param {Object} pendingCompletions - Task pending completions data
 * @param {Object} rotationSettings - The rotation settings
 * @returns {Object} - { shouldAdvance: boolean, reason: string }
 */
function checkOccurrenceBasedRotation(
  task,
  selectedDate,
  completingUser,
  completions,
  pendingCompletions,
  rotationSettings,
) {
  const requiredOccurrences = rotationSettings.value || 1;

  // Count how many times the current user has completed this task since their turn started
  const userCompletions = countUserCompletionsSinceLastRotation(
    task,
    selectedDate,
    completingUser,
    completions,
    pendingCompletions,
  );

  if (userCompletions >= requiredOccurrences) {
    return {
      shouldAdvance: true,
      reason: `User completed ${userCompletions}/${requiredOccurrences} required occurrences`,
    };
  } else {
    return {
      shouldAdvance: false,
      reason: `User completed only ${userCompletions}/${requiredOccurrences} required occurrences`,
    };
  }
}

/**
 * Check if rotation should advance based on time elapsed
 * @param {Object} task - The task object
 * @param {string} selectedDate - The date in YYYY-MM-DD format
 * @param {Object} rotationSettings - The rotation settings
 * @returns {Object} - { shouldAdvance: boolean, reason: string }
 */
function checkTimeBasedRotation(task, selectedDate, rotationSettings) {
  const requiredTime = rotationSettings.value || 1;
  const timeUnit = rotationSettings.unit || "days"; // days or weeks

  // Get the last rotation date
  const lastRotationDate = getLastRotationDate(task, selectedDate);

  if (!lastRotationDate) {
    // No previous rotation, advance
    return { shouldAdvance: true, reason: "No previous rotation date found" };
  }

  const daysSinceRotation = getDaysDifference(lastRotationDate, selectedDate);
  const requiredDays = timeUnit === "weeks" ? requiredTime * 7 : requiredTime;

  if (daysSinceRotation >= requiredDays) {
    return {
      shouldAdvance: true,
      reason: `${daysSinceRotation} days passed, required ${requiredDays} days`,
    };
  } else {
    return {
      shouldAdvance: false,
      reason: `Only ${daysSinceRotation} days passed, need ${requiredDays} days`,
    };
  }
}

/**
 * Count user completions since their turn started (for occurrence-based rotation)
 * @param {Object} task - The task object
 * @param {string} selectedDate - The date in YYYY-MM-DD format
 * @param {string} user - The user to count completions for
 * @param {Object} completions - Task completions data
 * @param {Object} pendingCompletions - Task pending completions data
 * @returns {number} - Number of completions by user since their turn started
 */
function countUserCompletionsSinceLastRotation(
  task,
  selectedDate,
  user,
  completions,
  pendingCompletions,
) {
  // Get the date when this user's turn started
  const userTurnStartDate = getUserTurnStartDate(task, selectedDate, user);
  let totalUserCompletions = 0;

  // Count completions from turn start date to current date
  const currentDate = new Date(selectedDate);
  const startDate = new Date(userTurnStartDate);

  while (startDate <= currentDate) {
    const dateStr = startDate.toISOString().split("T")[0];
    const dayCompletions = completions[dateStr] || [];
    const dayPending = pendingCompletions[dateStr] || [];

    totalUserCompletions += dayCompletions.filter(
      (c) => c.user === user,
    ).length;
    totalUserCompletions += dayPending.filter((p) => p.user === user).length;

    startDate.setDate(startDate.getDate() + 1);
  }

  return totalUserCompletions;
}

/**
 * Get the date when rotation last advanced
 * @param {Object} task - The task object
 * @param {string} currentDate - The current date in YYYY-MM-DD format
 * @returns {string|null} - Last rotation date or null if not found
 */
function getLastRotationDate(task, currentDate) {
  // Check if task has rotation history
  if (task.rotationHistory && Array.isArray(task.rotationHistory)) {
    const sortedHistory = task.rotationHistory
      .filter((entry) => entry.date <= currentDate)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sortedHistory.length > 0) {
      return sortedHistory[0].date;
    }
  }

  // Fallback: use task creation date or start date
  if (task.createdAt) {
    return task.createdAt.split("T")[0]; // Extract date part
  }

  if (task.date && task.date.includes("to")) {
    const startDate = task.date.split(" to ")[0];
    return startDate;
  }

  return null;
}

/**
 * Get the date when the current user's turn started
 * @param {Object} task - The task object
 * @param {string} currentDate - The current date in YYYY-MM-DD format
 * @param {string} user - The user whose turn start date to find
 * @returns {string} - Turn start date
 */
function getUserTurnStartDate(task, currentDate, user) {
  // Check rotation history for when this user's turn started
  if (task.rotationHistory && Array.isArray(task.rotationHistory)) {
    const userTurnHistory = task.rotationHistory
      .filter((entry) => entry.toUser === user && entry.date <= currentDate)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (userTurnHistory.length > 0) {
      return userTurnHistory[0].date;
    }
  }

  // Fallback: if no history, assume turn started today
  return currentDate;
}

/**
 * Calculate difference in days between two dates
 * @param {string} date1 - First date (YYYY-MM-DD)
 * @param {string} date2 - Second date (YYYY-MM-DD)
 * @returns {number} - Difference in days
 */
function getDaysDifference(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const timeDifference = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
}

/**
 * Record rotation advancement in task history
 * @param {Object} task - The task object
 * @param {string} date - The date when rotation advanced
 * @param {string} fromUser - The user whose turn ended
 * @param {string} toUser - The user whose turn started
 * @param {string} reason - The reason for rotation advancement
 */
function recordRotationAdvancement(task, date, fromUser, toUser, reason) {
  if (!task.rotationHistory) {
    task.rotationHistory = [];
  }

  const rotationRecord = {
    date: date,
    fromUser: fromUser,
    toUser: toUser,
    reason: reason,
    timestamp: new Date().toISOString(),
  };

  task.rotationHistory.push(rotationRecord);

  // Keep only last 50 rotation records to prevent unlimited growth
  if (task.rotationHistory.length > 50) {
    task.rotationHistory = task.rotationHistory.slice(-50);
  }
}

/**
 * Get current turn user based on rotation settings and history
 * @param {Object} task - The task object
 * @param {string} selectedDate - The date in YYYY-MM-DD format
 * @returns {string} - Current turn user
 */
function getCurrentTurnUser(task, selectedDate) {
  if (
    !task.settings?.includes("Rotation") ||
    !task.users ||
    task.users.length === 0
  ) {
    return null;
  }

  // Use existing currentTurnIndex if available and valid
  if (
    typeof task.currentTurnIndex === "number" &&
    task.currentTurnIndex >= 0 &&
    task.currentTurnIndex < task.users.length
  ) {
    return task.users[task.currentTurnIndex];
  }

  // Fallback to first user
  task.currentTurnIndex = 0;
  return task.users[0];
}

/**
 * Advance rotation to next user
 * @param {Object} task - The task object
 * @param {string} date - The date when advancing
 * @param {string} reason - The reason for advancement
 * @returns {Object} - { previousUser: string, newUser: string }
 */
function advanceRotation(task, date, reason) {
  if (!task.users || task.users.length === 0) {
    return { previousUser: null, newUser: null };
  }

  const previousIndex = task.currentTurnIndex || 0;
  const previousUser = task.users[previousIndex];

  // Advance to next user
  task.currentTurnIndex = (previousIndex + 1) % task.users.length;
  const newUser = task.users[task.currentTurnIndex];

  // Record the rotation advancement
  recordRotationAdvancement(task, date, previousUser, newUser, reason);

  console.log(`🔄 Rotation advanced: ${previousUser} → ${newUser} (${reason})`);

  return { previousUser, newUser };
}

// Export functions for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    shouldAdvanceRotation,
    getCurrentTurnUser,
    advanceRotation,
    recordRotationAdvancement,
    checkOccurrenceBasedRotation,
    checkTimeBasedRotation,
    countUserCompletionsSinceLastRotation,
    getLastRotationDate,
    getUserTurnStartDate,
    getDaysDifference,
  };
}
