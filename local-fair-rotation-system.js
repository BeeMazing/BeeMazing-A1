/**
 * Local Fair Rotation System for BeeMazing
 *
 * This system implements fair rotation entirely locally without server dependencies.
 * It ensures continuous rotation across days and maintains fairness through completion tracking.
 *
 * Key Features:
 * 1. Pure local operation - no server API calls required
 * 2. Continuous global occurrence sequence across days
 * 3. Local completion tracking and fairness adjustment
 * 4. Real-time assignment updates after task completion
 * 5. Compatible with existing task structure
 */

console.log("🔄 Loading Local Fair Rotation System...");

class LocalFairRotationSystem {
  constructor() {
    this.debug = true;
    this.completionTracking = new Map(); // Local completion tracking
    this.fairnessAdjustments = new Map(); // Local fairness adjustments

    console.log("✅ Local Fair Rotation System Initialized");
  }

  /**
   * Calculate the correct assignee for a task occurrence using priority-based fairness
   * This is the core function that determines who should do each occurrence
   */
  calculateAssignee(task, selectedDate, occurrenceIndex = 0) {
    if (!task || !task.users || task.users.length === 0) {
      console.warn("⚠️ Invalid task data for assignment calculation");
      return null;
    }

    // Get completion history for this task and date
    const completionKey = `${task.title}_${selectedDate}`;
    const completions = this.completionTracking.get(completionKey) || [];

    // Count completions per user
    const userCompletions = {};
    task.users.forEach((user) => {
      userCompletions[user] = 0; // Initialize all task users
    });

    completions.forEach((completion) => {
      if (userCompletions.hasOwnProperty(completion.user)) {
        userCompletions[completion.user]++;
      }
    });

    // Create priority queue: users sorted by completion count (lowest first)
    const usersByPriority = [...task.users].sort((a, b) => {
      const countA = userCompletions[a];
      const countB = userCompletions[b];

      if (countA !== countB) {
        return countA - countB; // Users with fewer completions first
      }

      // If equal completions, use preset rotation order (task.users order)
      return task.users.indexOf(a) - task.users.indexOf(b);
    });

    // Calculate base assignment using global occurrence for preset rotation
    const globalOccurrence = this.calculateGlobalOccurrenceNumber(
      task,
      selectedDate,
      occurrenceIndex,
    );
    const baseUserIndex = (globalOccurrence - 1) % task.users.length;
    const baseAssignedUser = task.users[baseUserIndex];

    // Determine fair assignment based on priority
    let assignedUser;
    let assignmentReason;

    // Find minimum completion count
    const minCompletions = Math.min(...Object.values(userCompletions));
    const usersWithMinCompletions = usersByPriority.filter(
      (user) => userCompletions[user] === minCompletions,
    );

    if (usersWithMinCompletions.length === task.users.length) {
      // Everyone has equal completions - use preset rotation
      assignedUser = baseAssignedUser;
      assignmentReason = "equal-completions-preset-rotation";
    } else {
      // Some users have fewer completions - prioritize them
      // Among users with min completions, use preset rotation order
      const priorityUserIndex =
        (globalOccurrence - 1) % usersWithMinCompletions.length;
      assignedUser = usersWithMinCompletions[priorityUserIndex];
      assignmentReason = "priority-based-fairness";
    }

    this.log(`Priority-based assignment for ${task.title}:`, {
      occurrence: occurrenceIndex + 1,
      globalOccurrence,
      userCompletions,
      usersByPriority,
      minCompletions,
      usersWithMinCompletions,
      baseAssignedUser,
      assignedUser,
      assignmentReason,
    });

    return {
      user: assignedUser,
      userIndex: task.users.indexOf(assignedUser),
      globalOccurrence: globalOccurrence,
      userCompletions: userCompletions,
      assignmentReason: assignmentReason,
    };
  }

  /**
   * Calculate global occurrence number for continuous rotation across days
   * This ensures rotation continues properly from day to day
   */
  calculateGlobalOccurrenceNumber(task, selectedDate, occurrenceIndex = 0) {
    try {
      // Use existing calculateGlobalOccurrenceNumber if available
      if (typeof calculateGlobalOccurrenceNumber === "function") {
        return calculateGlobalOccurrenceNumber(
          task,
          selectedDate,
          occurrenceIndex,
        );
      }

      // Fallback implementation
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
              ? Number.isInteger(task.originalTimesPerDay || task.timesPerDay)
                ? task.originalTimesPerDay || task.timesPerDay
                : 1
              : 1;

      const range = task.date.split(" to ");
      const taskStartDate = this.parseLocalDate(range[0]);
      const selected = this.parseLocalDate(selectedDate);

      let totalOccurrences = 0;

      // Count all occurrences from task start up to (but not including) selected date
      for (
        let currentDate = new Date(taskStartDate);
        currentDate < selected;
        currentDate.setDate(currentDate.getDate() + 1)
      ) {
        if (repeat === "Daily") {
          totalOccurrences += requiredTimes;
        }
      }

      // Add current occurrence
      totalOccurrences += occurrenceIndex + 1;

      return totalOccurrences;
    } catch (error) {
      console.error("Error calculating global occurrence:", error);
      return occurrenceIndex + 1; // Fallback to simple numbering
    }
  }

  /**
   * Parse date string to Date object (fallback implementation)
   */
  parseLocalDate(dateStr) {
    if (typeof parseLocalDate === "function") {
      return parseLocalDate(dateStr);
    }

    // Simple fallback
    const parts = dateStr.split("-");
    return new Date(
      parseInt(parts[0]),
      parseInt(parts[1]) - 1,
      parseInt(parts[2]),
    );
  }

  /**
   * Check if a user is assigned to a specific task occurrence
   */
  isUserAssigned(task, selectedDate, userName, occurrenceIndex = 0) {
    if (!task.fairRotation) {
      // For non-fair rotation, use existing logic
      return task.users.includes(userName);
    }

    const assignment = this.calculateAssignee(
      task,
      selectedDate,
      occurrenceIndex,
    );
    const isAssigned = assignment && assignment.user === userName;

    this.log(`User assignment check for ${userName}:`, {
      taskTitle: task.title,
      occurrence: occurrenceIndex + 1,
      calculatedUser: assignment?.user,
      isAssigned,
    });

    return isAssigned;
  }

  /**
   * Record task completion locally for fairness tracking
   */
  recordCompletion(
    taskTitle,
    selectedDate,
    completingUser,
    occurrenceIndex = 0,
  ) {
    const completionKey = `${taskTitle}_${selectedDate}`;

    if (!this.completionTracking.has(completionKey)) {
      this.completionTracking.set(completionKey, []);
    }

    const completions = this.completionTracking.get(completionKey);
    completions.push({
      user: completingUser,
      occurrence: occurrenceIndex + 1,
      timestamp: new Date().toISOString(),
    });

    console.log(
      `📝 Recorded completion: ${taskTitle} occurrence ${occurrenceIndex + 1} by ${completingUser}`,
    );

    // Trigger fairness recalculation
    this.recalculateFairness(taskTitle, selectedDate);
  }

  /**
   * Recalculate fairness priorities based on completion history
   * Priority-based logic: Users with fewer completions get priority for future assignments
   */
  recalculateFairness(taskTitle, selectedDate) {
    try {
      const completionKey = `${taskTitle}_${selectedDate}`;
      const completions = this.completionTracking.get(completionKey) || [];

      if (completions.length === 0) {
        console.log(`No completions for ${taskTitle} on ${selectedDate}`);
        return;
      }

      // Count completions per user
      const userCompletions = {};
      completions.forEach((completion) => {
        userCompletions[completion.user] =
          (userCompletions[completion.user] || 0) + 1;
      });

      // Calculate fairness metrics
      const completionCounts = Object.values(userCompletions);
      const maxCompletions = Math.max(...completionCounts);
      const minCompletions = Math.min(...completionCounts);
      const imbalance = maxCompletions - minCompletions;

      // Identify users by completion level
      const usersByCompletions = {};
      Object.entries(userCompletions).forEach(([user, count]) => {
        if (!usersByCompletions[count]) {
          usersByCompletions[count] = [];
        }
        usersByCompletions[count].push(user);
      });

      console.log(`⚖️ Priority-based fairness for ${taskTitle}:`, {
        userCompletions,
        minCompletions,
        maxCompletions,
        imbalance,
        usersByCompletions,
        priorityLogic:
          imbalance > 0
            ? "Users with fewer completions get priority"
            : "Everyone equal - normal rotation",
      });

      // Trigger UI refresh since assignment logic has changed
      this.triggerUIRefresh();
    } catch (error) {
      console.error("Error in fairness recalculation:", error);
    }
  }

  /**
   * Get turn data for a task on a specific date (replaces mixedTurnData for fair rotation)
   */
  getLocalTurnData(task, selectedDate) {
    try {
      if (!task || !task.users || task.users.length === 0) {
        console.warn("⚠️ Invalid task for turn data calculation");
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

      // Build turns using local assignment calculation
      for (let i = 0; i < requiredTimes; i++) {
        const assignment = this.calculateAssignee(task, selectedDate, i);

        if (!assignment) {
          console.warn(
            `⚠️ Could not calculate assignment for occurrence ${i + 1}`,
          );
          continue;
        }

        // Check if this occurrence is completed or pending
        let isCompleted = false;
        let isPending = false;
        let completionTime = null;

        // Find matching completion for this occurrence
        const matchingCompletion = completions.find(
          (c) =>
            c.user === assignment.user &&
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
          user: assignment.user,
          originalUser: assignment.user,
          repetition: i + 1,
          isCompleted,
          isPending,
          completionTime,
          index: i,
          globalOccurrence: assignment.globalOccurrence,
          isPredicted: true,
          source: "priority-based-fair-rotation",
          userCompletions: assignment.userCompletions,
          assignmentReason: assignment.assignmentReason,
        });
      }

      const completedCount = completions.filter((c) => !c.isPending).length;

      this.log(`Turn data calculated for ${task.title}:`, {
        date: selectedDate,
        requiredTimes,
        turnsGenerated: turns.length,
        completedCount,
      });

      return {
        turns,
        completedCount,
        requiredTimes,
        usedLocalFairRotation: true,
      };
    } catch (error) {
      console.error("Error in getLocalTurnData:", error);
      return { turns: [], completedCount: 0, requiredTimes: 1 };
    }
  }

  /**
   * Handle task completion - record and recalculate
   */
  onTaskCompleted(
    taskTitle,
    completingUser,
    selectedDate,
    occurrenceIndex = 0,
  ) {
    console.log(`🎯 Local fair rotation - task completed:`, {
      taskTitle,
      completingUser,
      selectedDate,
      occurrence: occurrenceIndex + 1,
    });

    // Record the completion locally
    this.recordCompletion(
      taskTitle,
      selectedDate,
      completingUser,
      occurrenceIndex,
    );
  }

  /**
   * Trigger UI refresh after changes
   */
  triggerUIRefresh() {
    console.log("🔄 Triggering UI refresh for local fair rotation");

    // Refresh current tab if functions are available
    setTimeout(() => {
      if (
        typeof loadUserTasks === "function" &&
        typeof loadAllTasks === "function"
      ) {
        const currentUser =
          localStorage.getItem("currentUserName") ||
          new URLSearchParams(window.location.search).get("user");
        const selectedDate = new Date().toLocaleDateString("sv-SE");

        // Check which tab is active and refresh accordingly
        const myTasksTab = document.getElementById("myTasks");
        const allTasksTab = document.getElementById("allTasks");

        if (myTasksTab && !myTasksTab.classList.contains("hidden")) {
          loadUserTasks(currentUser, selectedDate);
        }

        if (allTasksTab && !allTasksTab.classList.contains("hidden")) {
          loadAllTasks(selectedDate);
        }
      }

      // Also refresh tasks.html if loadTasksForDate is available
      if (typeof loadTasksForDate === "function") {
        const selectedDate = new Date().toLocaleDateString("sv-SE");
        loadTasksForDate(selectedDate);
      }
    }, 500);
  }

  /**
   * Reset fairness adjustments for a specific task and date
   */
  resetFairness(taskTitle, selectedDate) {
    const adjustmentKey = `${taskTitle}_${selectedDate}`;
    this.fairnessAdjustments.delete(adjustmentKey);
    console.log(
      `🔄 Reset fairness adjustments for ${taskTitle} on ${selectedDate}`,
    );
  }

  /**
   * Get debug information about current state
   */
  getDebugInfo(taskTitle, selectedDate) {
    const completionKey = `${taskTitle}_${selectedDate}`;
    const completions = this.completionTracking.get(completionKey) || [];

    // Calculate user completion counts
    const userCompletions = {};
    completions.forEach((completion) => {
      userCompletions[completion.user] =
        (userCompletions[completion.user] || 0) + 1;
    });

    return {
      completions: completions,
      userCompletions: userCompletions,
      totalTrackedTasks: this.completionTracking.size,
      totalAdjustments: this.fairnessAdjustments.size,
      fairnessStatus:
        completions.length > 0
          ? this.getFairnessStatus(userCompletions)
          : "no-completions",
    };
  }

  /**
   * Get fairness status summary
   */
  getFairnessStatus(userCompletions) {
    if (Object.keys(userCompletions).length === 0) return "no-completions";

    const counts = Object.values(userCompletions);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);
    const imbalance = maxCount - minCount;

    if (imbalance === 0) return "balanced";
    if (imbalance === 1) return "minor-imbalance";
    return "significant-imbalance";
  }

  /**
   * Utility function for debug logging
   */
  log(message, data = null) {
    if (this.debug) {
      console.log(`🔄 [LocalFairRotation] ${message}`, data || "");
    }
  }
}

// Create global instance
window.localFairRotationSystem = new LocalFairRotationSystem();

// Integration functions
window.onLocalFairRotationTaskCompleted = function (
  taskTitle,
  completingUser,
  selectedDate,
  occurrenceIndex = 0,
) {
  if (window.localFairRotationSystem) {
    window.localFairRotationSystem.onTaskCompleted(
      taskTitle,
      completingUser,
      selectedDate,
      occurrenceIndex,
    );
  }
};

// Enhanced mixedTurnData that uses local fair rotation
window.localFairRotationTurnData = function (task, selectedDate) {
  if (window.localFairRotationSystem && task.fairRotation) {
    return window.localFairRotationSystem.getLocalTurnData(task, selectedDate);
  } else {
    // Fallback to existing mixedTurnData if available
    if (typeof mixedTurnData === "function") {
      return mixedTurnData(task, selectedDate);
    }
    return { turns: [], completedCount: 0, requiredTimes: 1 };
  }
};

// User assignment checker
window.isUserAssignedToLocalFairRotation = function (
  task,
  selectedDate,
  userName,
  occurrenceIndex = 0,
) {
  if (window.localFairRotationSystem && task.fairRotation) {
    return window.localFairRotationSystem.isUserAssigned(
      task,
      selectedDate,
      userName,
      occurrenceIndex,
    );
  }
  return false;
};

console.log("✅ Local Fair Rotation System Loaded and Ready");

// Export for testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = LocalFairRotationSystem;
}
