// Fair Rotation Dynamic Recalculation System
// Implements dynamic fair rotation for tasks with multiple occurrences
// Recalculates assignments after each completion to maintain fairness

console.log("🔄 Fair Rotation Dynamic System Loading...");

/**
 * Fair Rotation Dynamic System
 *
 * Key Features:
 * 1. Initial assignment calculation on task creation
 * 2. Dynamic recalculation after each occurrence completion
 * 3. Fair distribution based on completion history
 * 4. Integration with existing task completion workflow
 * 5. Proper user filtering for My Tasks / All Tasks
 */

class FairRotationDynamicSystem {
  constructor() {
    this.debug = true;
    this.completionHistory = new Map(); // Track completion history per task

    console.log("✅ Fair Rotation Dynamic System Initialized");
  }

  /**
   * Calculate initial fair rotation assignments for all occurrences
   * Called when task is first created
   */
  calculateInitialAssignments(task, occurrences, users) {
    console.log("🎯 Calculating initial fair rotation assignments", {
      taskTitle: task.originalTitle || task.title,
      occurrences: occurrences.length,
      users: users,
    });

    // For initial assignment, distribute occurrences evenly
    const assignments = [];

    for (let i = 0; i < occurrences.length; i++) {
      const assignedUserIndex = i % users.length;
      assignments.push({
        occurrence: i + 1,
        assignedUserIndex: assignedUserIndex,
        assignedUser: users[assignedUserIndex],
        status: "pending",
      });
    }

    this.log("Initial assignments calculated:", assignments);
    return assignments;
  }

  /**
   * Recalculate fair rotation assignments after a completion
   * This is the core fair rotation logic
   */
  async recalculateAssignments(
    taskTitle,
    completedOccurrence,
    completingUser,
    selectedDate,
  ) {
    console.log("🔄 Starting fair rotation recalculation", {
      taskTitle,
      completedOccurrence,
      completingUser,
      selectedDate,
    });

    try {
      // 1. Get current task data from server
      const adminEmail = localStorage.getItem("currentAdminEmail");
      console.log("🔍 Fetching task data for:", taskTitle);
      const taskData = await this.fetchTaskData(taskTitle, adminEmail);

      console.log("🔍 Received task data:", {
        taskData: Array.isArray(taskData)
          ? `Array[${taskData.length}]`
          : taskData?.title || "null/undefined",
        hasUsers: taskData?.users
          ? `${taskData.users.length} users`
          : "no users property",
        isArray: Array.isArray(taskData),
      });

      if (!taskData) {
        console.error("❌ Could not fetch task data for recalculation");
        return false;
      }

      // 2. Get completion history for this task
      const completionHistory = await this.getCompletionHistory(
        taskTitle,
        selectedDate,
        adminEmail,
      );

      // 3. Calculate fair assignments for remaining occurrences
      console.log("🧮 About to calculate fair assignments with:", {
        taskDataType: Array.isArray(taskData) ? "array" : typeof taskData,
        taskDataKeys: taskData ? Object.keys(taskData) : "null",
        completionHistoryLength: completionHistory?.length || 0,
      });

      const fairAssignments = this.calculateFairAssignments(
        taskData,
        completionHistory,
        selectedDate,
      );

      // 4. Update server with new assignments
      const updateResult = await this.updateTaskAssignments(
        taskTitle,
        fairAssignments,
        selectedDate,
        adminEmail,
      );

      if (updateResult.success) {
        console.log("✅ Fair rotation recalculation completed successfully");

        // 5. Trigger UI refresh
        this.triggerUIRefresh();

        return true;
      } else {
        console.error(
          "❌ Failed to update task assignments",
          updateResult.error,
        );
        return false;
      }
    } catch (error) {
      console.error("❌ Error during fair rotation recalculation:", error);
      return false;
    }
  }

  /**
   * Calculate fair assignments based on completion history
   */
  calculateFairAssignments(taskData, completionHistory, selectedDate) {
    console.log("🧮 Calculating fair assignments", {
      taskData: taskData ? taskData.title : "undefined",
      completionHistory,
    });

    if (!taskData) {
      console.error("❌ Fair rotation: No task data provided");
      return [];
    }

    if (Array.isArray(taskData)) {
      console.error(
        "❌ Fair rotation: Received array instead of task object",
        taskData,
      );
      // Try to use the first task if it's an array
      if (taskData.length > 0 && taskData[0].users) {
        console.log("🔧 Using first task from array for fair rotation");
        taskData = taskData[0];
      } else {
        return [];
      }
    }

    if (!taskData.users) {
      console.error(
        "❌ Fair rotation: Task data missing users property",
        taskData,
      );
      return [];
    }

    const users = taskData.users;
    const occurrences = this.getOccurrencesForDate(taskData, selectedDate);

    // Count completions per user for this task on this date
    const userCompletions = {};
    users.forEach((user) => {
      userCompletions[user] = 0;
    });

    // Count completed occurrences
    completionHistory.forEach((completion) => {
      if (userCompletions.hasOwnProperty(completion.completedBy)) {
        userCompletions[completion.completedBy]++;
      }
    });

    console.log("👥 User completion counts:", userCompletions);

    // Calculate fair assignments for remaining occurrences
    const pendingOccurrences = occurrences.filter(
      (occ) =>
        !completionHistory.some((comp) => comp.occurrence === occ.occurrence),
    );

    console.log("⏳ Pending occurrences:", pendingOccurrences.length);

    // Sort users by completion count (ascending) to prioritize those with fewer completions
    const sortedUsers = users
      .slice()
      .sort((a, b) => userCompletions[a] - userCompletions[b]);

    // Assign remaining occurrences fairly
    const newAssignments = [];
    let userIndex = 0;

    pendingOccurrences.forEach((occurrence, index) => {
      const assignedUser = sortedUsers[userIndex % sortedUsers.length];
      const assignedUserIndex = users.indexOf(assignedUser);

      newAssignments.push({
        occurrence: occurrence.occurrence,
        title: occurrence.title,
        assignedUserIndex: assignedUserIndex,
        assignedUser: assignedUser,
        status: "pending",
      });

      userIndex++;
    });

    console.log("🎯 New fair assignments:", newAssignments);
    return newAssignments;
  }

  /**
   * Get occurrences for a specific date from task data
   */
  getOccurrencesForDate(taskData, selectedDate) {
    // Find all occurrences of this task for the selected date
    const occurrences = [];

    if (Array.isArray(taskData)) {
      // Multiple task entries (occurrences)
      taskData.forEach((task) => {
        if (task.date === selectedDate && task.occurrence) {
          occurrences.push({
            occurrence: task.occurrence,
            title: task.title,
            currentTurnIndex: task.currentTurnIndex,
          });
        }
      });
    } else if (taskData.occurrence) {
      // Single occurrence task
      occurrences.push({
        occurrence: taskData.occurrence,
        title: taskData.title,
        currentTurnIndex: taskData.currentTurnIndex,
      });
    }

    return occurrences.sort((a, b) => a.occurrence - b.occurrence);
  }

  /**
   * Fetch task data from server
   */
  async fetchTaskData(taskTitle, adminEmail) {
    try {
      const cacheBuster = `t=${Date.now()}&r=${Math.random()}`;
      const response = await fetch(
        `https://beemazing1.onrender.com/api/tasks?adminEmail=${encodeURIComponent(adminEmail)}&${cacheBuster}`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch tasks");
      }

      // Find all tasks matching the title (including occurrences)
      const baseTitle = taskTitle.split(" - ")[0]; // e.g., "testa versija" from "testa versija - 2nd"

      const matchingTasks = data.tasks.filter(
        (task) =>
          task.title === taskTitle ||
          task.title.startsWith(baseTitle + " - ") ||
          (task.originalTitle && task.originalTitle === baseTitle),
      );

      console.log("🔍 Task matching results:", {
        searchTitle: taskTitle,
        baseTitle: baseTitle,
        totalTasks: data.tasks.length,
        matchingTasksCount: matchingTasks.length,
        matchingTitles: matchingTasks.map((t) => t.title),
      });

      if (matchingTasks.length === 0) {
        console.warn(`⚠️ No tasks found matching: ${taskTitle}`);
        console.warn(
          "Available task titles:",
          data.tasks.map((t) => t.title),
        );
        return null;
      }

      // For fair rotation, we need the base task data (users, schedule info)
      // If we have multiple occurrences, use the first one as they share the same config
      const baseTask = matchingTasks[0];

      // If multiple tasks found, merge their occurrence information
      if (matchingTasks.length > 1) {
        console.log(
          `🔄 Found ${matchingTasks.length} task occurrences for: ${taskTitle}`,
        );

        // Create a combined task object with all occurrences
        const combinedTask = {
          ...baseTask,
          allOccurrences: matchingTasks,
          totalOccurrences: matchingTasks.length,
        };

        return combinedTask;
      }

      return baseTask;
    } catch (error) {
      console.error("❌ Error fetching task data:", error);
      return null;
    }
  }

  /**
   * Get completion history for a task on a specific date
   */
  async getCompletionHistory(taskTitle, selectedDate, adminEmail) {
    try {
      const response = await fetch(
        `https://beemazing1.onrender.com/api/task-completions?adminEmail=${encodeURIComponent(adminEmail)}&taskTitle=${encodeURIComponent(taskTitle)}&date=${selectedDate}`,
      );

      if (response.ok) {
        const data = await response.json();
        return data.completions || [];
      } else {
        console.warn(
          "⚠️ Could not fetch completion history, using empty history",
        );
        return [];
      }
    } catch (error) {
      console.warn("⚠️ Error fetching completion history:", error);
      return [];
    }
  }

  /**
   * Update task assignments on server
   */
  async updateTaskAssignments(
    taskTitle,
    assignments,
    selectedDate,
    adminEmail,
  ) {
    try {
      const response = await fetch(
        "https://beemazing1.onrender.com/api/update-task-assignments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            adminEmail,
            taskTitle,
            assignments,
            date: selectedDate,
            fairRotation: true,
          }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        return { success: true, data };
      } else {
        return { success: false, error: data.error || "Update failed" };
      }
    } catch (error) {
      console.error("❌ Error updating task assignments:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Trigger UI refresh after recalculation
   */
  triggerUIRefresh() {
    console.log("🔄 Triggering UI refresh");

    // Refresh current tab
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
        setTimeout(() => loadUserTasks(currentUser, selectedDate), 500);
      }

      if (allTasksTab && !allTasksTab.classList.contains("hidden")) {
        setTimeout(() => loadAllTasks(currentUser, selectedDate), 500);
      }
    }
  }

  /**
   * Check if a task should use fair rotation
   */
  shouldUseFairRotation(task) {
    return (
      task.settings?.includes("Rotation") &&
      (task.fairRotation === true || task.rotation?.type === "fair") &&
      task.fairRotationTimeBased !== true
    );
  }

  /**
   * Hook into task completion workflow
   * This should be called from the finishTask function
   */
  async onTaskCompleted(taskTitle, completingUser, selectedDate) {
    console.log("🎯 Task completion detected", {
      taskTitle,
      completingUser,
      selectedDate,
    });

    // Check if this is a fair rotation task
    const adminEmail = localStorage.getItem("currentAdminEmail");
    const taskData = await this.fetchTaskData(taskTitle, adminEmail);

    if (!taskData) {
      console.log("⚠️ Could not fetch task data, skipping fair rotation");
      return;
    }

    // Handle both single task and multiple occurrences
    const tasks = Array.isArray(taskData) ? taskData : [taskData];
    const fairRotationTask = tasks.find((t) => this.shouldUseFairRotation(t));

    if (fairRotationTask) {
      console.log("✅ Fair rotation task detected, triggering recalculation");

      // Extract occurrence number from title if present
      const occurrenceMatch = taskTitle.match(/- (\d+)\w+$/);
      const occurrence = occurrenceMatch ? parseInt(occurrenceMatch[1]) : 1;

      await this.recalculateAssignments(
        fairRotationTask.originalTitle || taskTitle,
        occurrence,
        completingUser,
        selectedDate,
      );
    } else {
      console.log("ℹ️ Not a fair rotation task, no recalculation needed");
    }
  }

  /**
   * Utility function for debug logging
   */
  log(message, data = null) {
    if (this.debug) {
      console.log(`🔄 [FairRotation] ${message}`, data || "");
    }
  }
}

// Create global instance
window.fairRotationSystem = new FairRotationDynamicSystem();

// Integration function to be called from finishTask
window.onFairRotationTaskCompleted = async function (
  taskTitle,
  completingUser,
  selectedDate,
) {
  if (window.fairRotationSystem) {
    await window.fairRotationSystem.onTaskCompleted(
      taskTitle,
      completingUser,
      selectedDate,
    );
  }
};

console.log("✅ Fair Rotation Dynamic System Loaded");

// Export for testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = FairRotationDynamicSystem;
}
