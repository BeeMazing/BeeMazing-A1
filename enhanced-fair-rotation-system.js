// Enhanced Fair Rotation System
// Implements comprehensive fair rotation with provisional states and rollback capabilities
// Features: Cumulative tracking, time-based tiebreaker, dynamic reallocation, approval workflow

console.log("🔄 Enhanced Fair Rotation System Loading...");

/**
 * Enhanced Fair Rotation System
 *
 * Key Features:
 * 1. Cumulative completion tracking across all dates
 * 2. Time-based tiebreaker for equal completion counts
 * 3. Dynamic reallocation of all future assignments
 * 4. Provisional state management for pending approvals
 * 5. Rollback mechanism for rejected completions
 * 6. Multi-pending task handling
 */
class EnhancedFairRotationSystem {
  constructor() {
    this.debug = true;

    // Core data structures
    this.completionHistory = new Map(); // taskTitle -> completion data
    this.assignmentState = new Map(); // taskTitle -> assignment data
    this.pendingCounter = 0; // Unique ID generator for pending completions

    // State tracking
    this.taskUsers = new Map(); // taskTitle -> users array
    this.taskSchedules = new Map(); // taskTitle -> schedule info

    console.log("✅ Enhanced Fair Rotation System Initialized");
  }

  /**
   * Initialize task data when task is created
   */
  initializeTask(taskTitle, users, scheduleInfo) {
    this.log(`Initializing task: ${taskTitle}`, { users, scheduleInfo });

    this.taskUsers.set(taskTitle, users);
    this.taskSchedules.set(taskTitle, scheduleInfo);

    // Initialize completion history
    if (!this.completionHistory.has(taskTitle)) {
      this.completionHistory.set(taskTitle, {
        approved: [],
        pending: [],
        rejected: [],
      });
    }

    // Initialize assignment state
    if (!this.assignmentState.has(taskTitle)) {
      this.assignmentState.set(taskTitle, {
        baseline: [],
        provisional: [],
      });
    }

    // Calculate initial assignments
    this.recalculateAssignments(taskTitle, false);
  }

  /**
   * Handle task completion (goes to pending state)
   */
  async onTaskCompleted(
    taskTitle,
    completingUser,
    selectedDate,
    occurrenceNumber,
  ) {
    this.log(`Task completed (pending approval): ${taskTitle}`, {
      user: completingUser,
      date: selectedDate,
      occurrence: occurrenceNumber,
    });

    try {
      // Generate unique pending ID
      const pendingId = `pending_${++this.pendingCounter}_${Date.now()}`;

      // Get completion history
      const history = this.completionHistory.get(taskTitle);
      if (!history) {
        console.error(`❌ No completion history found for task: ${taskTitle}`);
        return false;
      }

      // Add to pending completions
      const pendingCompletion = {
        user: completingUser,
        occurrence: occurrenceNumber,
        date: selectedDate,
        timestamp: new Date().toISOString(),
        pendingId: pendingId,
      };

      history.pending.push(pendingCompletion);

      // Trigger provisional recalculation
      await this.recalculateAssignments(taskTitle, true);

      // Update server with provisional assignments
      await this.updateServerAssignments(taskTitle, true);

      this.log(`✅ Task completion recorded as pending: ${pendingId}`);
      return { success: true, pendingId };
    } catch (error) {
      console.error(`❌ Error handling task completion:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle task approval by parent
   */
  async onTaskApproved(taskTitle, pendingId) {
    this.log(`Task approved: ${taskTitle}`, { pendingId });

    try {
      const history = this.completionHistory.get(taskTitle);
      if (!history) {
        throw new Error(`No completion history found for task: ${taskTitle}`);
      }

      // Find pending completion
      const pendingIndex = history.pending.findIndex(
        (p) => p.pendingId === pendingId,
      );
      if (pendingIndex === -1) {
        throw new Error(`Pending completion not found: ${pendingId}`);
      }

      // Move from pending to approved
      const approvedCompletion = history.pending.splice(pendingIndex, 1)[0];
      delete approvedCompletion.pendingId; // Remove pending ID
      history.approved.push(approvedCompletion);

      // Convert provisional assignments to baseline
      const assignmentData = this.assignmentState.get(taskTitle);
      if (assignmentData && assignmentData.provisional.length > 0) {
        assignmentData.baseline = [...assignmentData.provisional];
      }

      // Update server with confirmed assignments
      await this.updateServerAssignments(taskTitle, false);

      this.log(`✅ Task approval processed successfully`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Error handling task approval:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle task rejection by parent
   */
  async onTaskRejected(taskTitle, pendingId, reason = "") {
    this.log(`Task rejected: ${taskTitle}`, { pendingId, reason });

    try {
      const history = this.completionHistory.get(taskTitle);
      if (!history) {
        throw new Error(`No completion history found for task: ${taskTitle}`);
      }

      // Find and remove pending completion
      const pendingIndex = history.pending.findIndex(
        (p) => p.pendingId === pendingId,
      );
      if (pendingIndex === -1) {
        throw new Error(`Pending completion not found: ${pendingId}`);
      }

      const rejectedCompletion = history.pending.splice(pendingIndex, 1)[0];

      // Add to rejected history for audit trail
      rejectedCompletion.rejectedAt = new Date().toISOString();
      rejectedCompletion.rejectionReason = reason;
      history.rejected.push(rejectedCompletion);

      // Rollback to baseline and recalculate
      await this.rollbackAndRecalculate(taskTitle);

      // Update server with corrected assignments
      await this.updateServerAssignments(taskTitle, true);

      this.log(`✅ Task rejection processed and assignments recalculated`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Error handling task rejection:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Rollback to baseline and recalculate assignments
   */
  async rollbackAndRecalculate(taskTitle) {
    this.log(`Rolling back and recalculating: ${taskTitle}`);

    const assignmentData = this.assignmentState.get(taskTitle);
    if (assignmentData) {
      // Reset to baseline
      assignmentData.provisional = [...assignmentData.baseline];
    }

    // Recalculate with current pending completions
    await this.recalculateAssignments(taskTitle, true);
  }

  /**
   * Core assignment recalculation logic
   */
  async recalculateAssignments(taskTitle, includeProvisional = false) {
    this.log(`Recalculating assignments for: ${taskTitle}`, {
      includeProvisional,
    });

    try {
      const users = this.taskUsers.get(taskTitle);
      const scheduleInfo = this.taskSchedules.get(taskTitle);

      if (!users || !scheduleInfo) {
        console.warn(`⚠️ Missing task data for: ${taskTitle}`);
        return;
      }

      // Get all completions (approved + pending if includeProvisional)
      const completions = this.getAllCompletions(taskTitle, includeProvisional);

      // Calculate user completion counts and last completion times
      const userStats = this.calculateUserStats(completions, users);

      // Get all future occurrences that need assignment
      const futureOccurrences = await this.getFutureOccurrences(
        taskTitle,
        completions,
      );

      // Calculate fair assignments for future occurrences
      const newAssignments = this.calculateFairAssignments(
        futureOccurrences,
        userStats,
        users,
      );

      // Update assignment state
      const assignmentData = this.assignmentState.get(taskTitle);
      if (assignmentData) {
        if (includeProvisional) {
          assignmentData.provisional = newAssignments;
        } else {
          assignmentData.baseline = newAssignments;
          assignmentData.provisional = [...newAssignments];
        }
      }

      this.log(`✅ Assignments recalculated`, {
        totalAssignments: newAssignments.length,
        userStats,
      });
    } catch (error) {
      console.error(`❌ Error recalculating assignments:`, error);
    }
  }

  /**
   * Get all relevant completions
   */
  getAllCompletions(taskTitle, includeProvisional) {
    const history = this.completionHistory.get(taskTitle);
    if (!history) return [];

    let completions = [...history.approved];

    if (includeProvisional) {
      completions = completions.concat(history.pending);
    }

    return completions.sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
    );
  }

  /**
   * Calculate user statistics (completion counts and last completion times)
   */
  calculateUserStats(completions, users) {
    const userStats = {};

    // Initialize all users
    users.forEach((user) => {
      userStats[user] = {
        completionCount: 0,
        lastCompletionTime: null,
      };
    });

    // Process completions
    completions.forEach((completion) => {
      if (userStats[completion.user]) {
        userStats[completion.user].completionCount++;
        userStats[completion.user].lastCompletionTime = completion.timestamp;
      }
    });

    return userStats;
  }

  /**
   * Get future occurrences that need assignment
   */
  async getFutureOccurrences(taskTitle, completions) {
    // Get task data from server to determine total occurrences
    const taskData = await this.fetchTaskData(taskTitle);
    if (!taskData) return [];

    const futureOccurrences = [];
    const completedOccurrences = new Set(
      completions.map((c) => `${c.date}_${c.occurrence}`),
    );

    // Generate future occurrences based on task schedule
    // This is a simplified version - in reality, this would need to match
    // the existing task generation logic
    const today = new Date();
    const scheduleInfo = this.taskSchedules.get(taskTitle);

    for (let dayOffset = 0; dayOffset < 365; dayOffset++) {
      // Project 1 year ahead
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + dayOffset);
      const dateStr = currentDate.toISOString().split("T")[0];

      // Determine occurrences for this date based on schedule
      const occurrencesPerDay = scheduleInfo?.occurrencesPerDay || 1;

      for (let occ = 1; occ <= occurrencesPerDay; occ++) {
        const occurrenceKey = `${dateStr}_${occ}`;

        if (!completedOccurrences.has(occurrenceKey)) {
          futureOccurrences.push({
            date: dateStr,
            occurrence: occ,
            globalOccurrence: this.calculateGlobalOccurrence(
              dateStr,
              occ,
              scheduleInfo,
            ),
          });
        }
      }
    }

    return futureOccurrences;
  }

  /**
   * Calculate fair assignments for future occurrences
   */
  calculateFairAssignments(futureOccurrences, userStats, users) {
    const assignments = [];

    futureOccurrences.forEach((occurrence) => {
      const assignedUser = this.selectBestUser(userStats, users);

      assignments.push({
        date: occurrence.date,
        occurrence: occurrence.occurrence,
        globalOccurrence: occurrence.globalOccurrence,
        assignedUser: assignedUser,
        assignedUserIndex: users.indexOf(assignedUser),
        assignmentReason: this.getAssignmentReason(userStats, assignedUser),
      });

      // Update user stats for next iteration (simulate completion)
      userStats[assignedUser].completionCount++;
      userStats[assignedUser].lastCompletionTime = new Date().toISOString();
    });

    return assignments;
  }

  /**
   * Select the best user for assignment using fair rotation logic
   */
  selectBestUser(userStats, users) {
    // Find users with minimum completion count
    const minCompletions = Math.min(
      ...users.map((user) => userStats[user].completionCount),
    );
    const candidateUsers = users.filter(
      (user) => userStats[user].completionCount === minCompletions,
    );

    if (candidateUsers.length === 1) {
      return candidateUsers[0];
    }

    // Time-based tiebreaker: select user with oldest last completion
    let selectedUser = candidateUsers[0];
    let oldestCompletionTime = userStats[selectedUser].lastCompletionTime;

    candidateUsers.forEach((user) => {
      const userLastCompletion = userStats[user].lastCompletionTime;

      // User who never completed gets priority
      if (!userLastCompletion) {
        selectedUser = user;
        oldestCompletionTime = null;
      } else if (
        oldestCompletionTime &&
        userLastCompletion < oldestCompletionTime
      ) {
        selectedUser = user;
        oldestCompletionTime = userLastCompletion;
      }
    });

    return selectedUser;
  }

  /**
   * Get assignment reason for debugging
   */
  getAssignmentReason(userStats, assignedUser) {
    const userCompletion = userStats[assignedUser];
    const allCompletions = Object.values(userStats).map(
      (s) => s.completionCount,
    );
    const minCompletions = Math.min(...allCompletions);

    if (userCompletion.completionCount === minCompletions) {
      const usersWithMinCompletions = Object.keys(userStats).filter(
        (user) => userStats[user].completionCount === minCompletions,
      );

      if (usersWithMinCompletions.length === 1) {
        return "lowest-completion-count";
      } else {
        return "time-based-tiebreaker";
      }
    }

    return "unknown";
  }

  /**
   * Calculate global occurrence number
   */
  calculateGlobalOccurrence(date, occurrence, scheduleInfo) {
    // This should match the existing global occurrence calculation logic
    // Simplified version here - would need to integrate with existing logic
    const startDate = new Date(scheduleInfo?.startDate || "2024-01-01");
    const currentDate = new Date(date);
    const daysDiff = Math.floor(
      (currentDate - startDate) / (1000 * 60 * 60 * 24),
    );
    const occurrencesPerDay = scheduleInfo?.occurrencesPerDay || 1;

    return daysDiff * occurrencesPerDay + occurrence;
  }

  /**
   * Fetch task data from server
   */
  async fetchTaskData(taskTitle) {
    try {
      const adminEmail = localStorage.getItem("currentAdminEmail");
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

      // Find matching task
      const matchingTask = data.tasks.find(
        (task) =>
          task.title === taskTitle ||
          (task.originalTitle && task.originalTitle === taskTitle),
      );

      return matchingTask;
    } catch (error) {
      console.error("❌ Error fetching task data:", error);
      return null;
    }
  }

  /**
   * Update server with assignment changes
   */
  async updateServerAssignments(taskTitle, isProvisional) {
    try {
      const assignmentData = this.assignmentState.get(taskTitle);
      if (!assignmentData) return;

      const assignments = isProvisional
        ? assignmentData.provisional
        : assignmentData.baseline;
      const adminEmail = localStorage.getItem("currentAdminEmail");

      const response = await fetch(
        "https://beemazing1.onrender.com/api/update-fair-rotation-assignments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            adminEmail,
            taskTitle,
            assignments,
            isProvisional,
            fairRotation: true,
          }),
        },
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to update assignments");
      }

      this.log(`✅ Server assignments updated`, {
        taskTitle,
        isProvisional,
        assignmentCount: assignments.length,
      });

      // Trigger frontend refresh for avatar updates
      await this.refreshFrontendAvatars(taskTitle, isProvisional);
    } catch (error) {
      console.error("❌ Error updating server assignments:", error);
    }
  }

  /**
   * Check if user is assigned to a specific occurrence
   */
  isUserAssigned(taskTitle, userName, selectedDate, occurrenceNumber) {
    const assignmentData = this.assignmentState.get(taskTitle);
    if (!assignmentData) return false;

    const assignments =
      assignmentData.provisional.length > 0
        ? assignmentData.provisional
        : assignmentData.baseline;

    const assignment = assignments.find(
      (a) => a.date === selectedDate && a.occurrence === occurrenceNumber,
    );

    return assignment ? assignment.assignedUser === userName : false;
  }

  /**
   * Get assignment information for a specific occurrence
   */
  getAssignmentInfo(taskTitle, selectedDate, occurrenceNumber) {
    const assignmentData = this.assignmentState.get(taskTitle);
    if (!assignmentData) return null;

    const assignments =
      assignmentData.provisional.length > 0
        ? assignmentData.provisional
        : assignmentData.baseline;

    return assignments.find(
      (a) => a.date === selectedDate && a.occurrence === occurrenceNumber,
    );
  }

  /**
   * Get debug information
   */
  getDebugInfo(taskTitle) {
    const history = this.completionHistory.get(taskTitle);
    const assignments = this.assignmentState.get(taskTitle);
    const users = this.taskUsers.get(taskTitle);

    if (!history || !users) {
      return { error: "Task not found" };
    }

    const userStats = this.calculateUserStats(
      this.getAllCompletions(taskTitle, true),
      users,
    );

    return {
      taskTitle,
      users,
      completionHistory: history,
      assignmentState: assignments,
      userStats,
      pendingCount: history.pending.length,
      approvedCount: history.approved.length,
      rejectedCount: history.rejected.length,
    };
  }

  /**
   * Reset all data for a task
   */
  resetTask(taskTitle) {
    this.completionHistory.delete(taskTitle);
    this.assignmentState.delete(taskTitle);
    this.taskUsers.delete(taskTitle);
    this.taskSchedules.delete(taskTitle);

    this.log(`✅ Task reset: ${taskTitle}`);
  }

  /**
   * Utility function for debug logging
   */
  log(message, data = null) {
    if (this.debug) {
      console.log(`🔄 EnhancedFairRotation: ${message}`, data || "");
    }
  }

  /**
   * Refresh frontend avatars after assignment changes
   */
  async refreshFrontendAvatars(taskTitle, isProvisional) {
    try {
      this.log(`🔄 Refreshing frontend avatars for: ${taskTitle}`, {
        isProvisional,
        timestamp: new Date().toISOString(),
      });

      // Check if we're in the tasks.html page
      if (typeof window !== "undefined") {
        // Method 1: Use existing loadTasksForDate function if available
        if (typeof window.loadTasksForDate === "function") {
          const currentDate = new Date().toISOString().split("T")[0];
          const selectedDate =
            localStorage.getItem("selectedDate") || currentDate;

          this.log(`🔄 Refreshing tasks for date: ${selectedDate}`);
          await window.loadTasksForDate(selectedDate);
        }

        // Method 2: Use forceRefreshTasks if available
        else if (typeof window.forceRefreshTasks === "function") {
          this.log(`🔄 Using force refresh method`);
          window.forceRefreshTasks();
        }

        // Method 3: Trigger custom event for manual listeners
        else {
          const event = new CustomEvent("fairRotationUpdate", {
            detail: {
              taskTitle,
              isProvisional,
              timestamp: new Date().toISOString(),
            },
          });
          window.dispatchEvent(event);
          this.log(`🔄 Dispatched fairRotationUpdate event`);
        }

        // Method 4: Direct DOM updates if task containers are found
        this.updateTaskAvatarsDirectly(taskTitle);
      }
    } catch (error) {
      console.error("❌ Error refreshing frontend avatars:", error);
    }
  }

  /**
   * Directly update task avatars in the DOM
   */
  updateTaskAvatarsDirectly(taskTitle) {
    try {
      // Find task containers that match the task title
      const taskContainers = document.querySelectorAll(
        ".task-item, .task-container, [data-task-title]",
      );

      taskContainers.forEach((container) => {
        const titleElement = container.querySelector(
          ".task-title, .task-name, h3, h4",
        );
        if (titleElement && titleElement.textContent.includes(taskTitle)) {
          // Mark for refresh
          container.classList.add("rotation-update-pending");
          container.setAttribute("data-rotation-update", Date.now());

          this.log(`🔄 Marked task container for update: ${taskTitle}`);
        }
      });

      // Notify any observers about the DOM changes
      if (typeof window.MutationObserver !== "undefined") {
        const event = new CustomEvent("taskAvatarsNeedUpdate", {
          detail: { taskTitle },
        });
        document.dispatchEvent(event);
      }
    } catch (error) {
      console.error("❌ Error updating task avatars directly:", error);
    }
  }

  /**
   * Set up automatic refresh listeners
   */
  setupAutoRefreshListeners() {
    if (typeof window !== "undefined") {
      // Listen for approval/rejection completion
      window.addEventListener("taskApprovalCompleted", (event) => {
        const { taskTitle, decision } = event.detail;
        this.log(`🔄 Received taskApprovalCompleted event`, {
          taskTitle,
          decision,
        });

        // Delay refresh slightly to ensure server updates are complete
        setTimeout(() => {
          this.refreshFrontendAvatars(taskTitle, false);
        }, 500);
      });

      // Listen for custom refresh requests
      window.addEventListener("fairRotationRefreshRequest", (event) => {
        const { taskTitle } = event.detail;
        this.refreshFrontendAvatars(taskTitle, false);
      });

      this.log(`✅ Auto-refresh listeners set up`);
    }
  }

  /**
   * Initialize with auto-refresh capabilities
   */
  initializeWithAutoRefresh() {
    this.setupAutoRefreshListeners();

    // Set up periodic check for stale data (every 30 seconds)
    if (typeof window !== "undefined") {
      setInterval(() => {
        this.checkForStaleAvatars();
      }, 30000);
    }
  }

  /**
   * Check for stale avatar data and refresh if needed
   */
  checkForStaleAvatars() {
    try {
      const containers = document.querySelectorAll("[data-rotation-update]");
      const now = Date.now();

      containers.forEach((container) => {
        const updateTime = parseInt(
          container.getAttribute("data-rotation-update"),
        );
        const age = now - updateTime;

        // If marked for update and it's been more than 5 seconds, trigger refresh
        if (
          age > 5000 &&
          container.classList.contains("rotation-update-pending")
        ) {
          const taskTitle =
            container.getAttribute("data-task-title") ||
            container.querySelector(".task-title, .task-name")?.textContent;

          if (taskTitle) {
            this.log(`🔄 Refreshing stale avatar data for: ${taskTitle}`);
            this.refreshFrontendAvatars(taskTitle, false);

            // Remove pending markers
            container.classList.remove("rotation-update-pending");
            container.removeAttribute("data-rotation-update");
          }
        }
      });
    } catch (error) {
      console.error("❌ Error checking for stale avatars:", error);
    }
  }
}

// Create global instance
window.enhancedFairRotationSystem = new EnhancedFairRotationSystem();

// Initialize auto-refresh capabilities if in browser environment
if (typeof window !== "undefined") {
  window.enhancedFairRotationSystem.initializeWithAutoRefresh();
}

// Integration functions for task completion workflow
window.onEnhancedFairRotationTaskCompleted = async function (
  taskTitle,
  completingUser,
  selectedDate,
  occurrenceNumber,
) {
  if (window.enhancedFairRotationSystem) {
    return await window.enhancedFairRotationSystem.onTaskCompleted(
      taskTitle,
      completingUser,
      selectedDate,
      occurrenceNumber,
    );
  }
  return {
    success: false,
    error: "Enhanced fair rotation system not available",
  };
};

// Integration functions for parent approval workflow
window.onEnhancedFairRotationTaskApproved = async function (
  taskTitle,
  pendingId,
) {
  if (window.enhancedFairRotationSystem) {
    return await window.enhancedFairRotationSystem.onTaskApproved(
      taskTitle,
      pendingId,
    );
  }
  return {
    success: false,
    error: "Enhanced fair rotation system not available",
  };
};

window.onEnhancedFairRotationTaskRejected = async function (
  taskTitle,
  pendingId,
  reason,
) {
  if (window.enhancedFairRotationSystem) {
    return await window.enhancedFairRotationSystem.onTaskRejected(
      taskTitle,
      pendingId,
      reason,
    );
  }
  return {
    success: false,
    error: "Enhanced fair rotation system not available",
  };
};

// Utility function to check if user is assigned to a task occurrence
window.isUserAssignedToEnhancedFairRotation = function (
  taskTitle,
  userName,
  selectedDate,
  occurrenceNumber,
) {
  if (window.enhancedFairRotationSystem) {
    return window.enhancedFairRotationSystem.isUserAssigned(
      taskTitle,
      userName,
      selectedDate,
      occurrenceNumber,
    );
  }
  return false;
};

// Utility function to get debug information
window.getEnhancedFairRotationDebugInfo = function (taskTitle) {
  if (window.enhancedFairRotationSystem) {
    return window.enhancedFairRotationSystem.getDebugInfo(taskTitle);
  }
  return { error: "Enhanced fair rotation system not available" };
};

console.log("✅ Enhanced Fair Rotation System Loaded");

// Export for testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = EnhancedFairRotationSystem;
}
