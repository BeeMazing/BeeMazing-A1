/**
 * Auto-Fix Enhanced Fair Rotation System
 *
 * This script automatically patches the Enhanced Fair Rotation System
 * to fix the "Task data not found" error without needing manual intervention.
 *
 * Simply include this script in userTasks.html and it will auto-apply the fix.
 */

(function () {
  "use strict";

  console.log("🔧 Auto-Fix Enhanced Fair Rotation System loading...");

  // Configuration
  const MAX_WAIT_ATTEMPTS = 100; // 20 seconds max wait
  const WAIT_INTERVAL = 200; // 200ms between checks

  let patchAttempts = 0;

  function waitForEnhancedSystem() {
    return new Promise((resolve, reject) => {
      const checkSystem = () => {
        patchAttempts++;

        if (window.EnhancedFairRotationSystem) {
          console.log(
            `✅ Enhanced Fair Rotation System found after ${patchAttempts} attempts`,
          );
          resolve();
        } else if (patchAttempts >= MAX_WAIT_ATTEMPTS) {
          console.log(
            `❌ Enhanced Fair Rotation System not found after ${patchAttempts} attempts`,
          );
          reject(new Error("Enhanced Fair Rotation System not available"));
        } else {
          setTimeout(checkSystem, WAIT_INTERVAL);
        }
      };
      checkSystem();
    });
  }

  async function applyAutoFix() {
    try {
      // Wait for Enhanced Fair Rotation System
      await waitForEnhancedSystem();

      console.log("🛠️ Applying Enhanced Fair Rotation System auto-fix...");

      // Store original functions
      const originalFetchTaskData =
        window.EnhancedFairRotationSystem.fetchTaskData;
      const originalRecalculateAssignments =
        window.EnhancedFairRotationSystem.recalculateAssignments;
      const originalGetAssignmentInfo =
        window.EnhancedFairRotationSystem.getAssignmentInfo;

      // Fix 1: Enhanced fetchTaskData with robust lookup
      window.EnhancedFairRotationSystem.fetchTaskData = function (taskName) {
        if (!this.taskGroups) {
          this.taskGroups = {};
          return null;
        }

        // Direct lookup
        if (this.taskGroups[taskName]) {
          return this.taskGroups[taskName];
        }

        // Case-insensitive lookup
        const lowerTaskName = taskName.toLowerCase();
        for (const [key, value] of Object.entries(this.taskGroups)) {
          if (key.toLowerCase() === lowerTaskName) {
            return value;
          }
        }

        // Partial match lookup
        for (const [key, value] of Object.entries(this.taskGroups)) {
          if (key.includes(taskName) || taskName.includes(key)) {
            return value;
          }
        }

        // If still not found, try to initialize from current task data
        const baseTaskName = taskName.replace(/ - \d+(st|nd|rd|th)$/, "");
        if (baseTaskName !== taskName && this.taskGroups[baseTaskName]) {
          return this.taskGroups[baseTaskName];
        }

        return null;
      };

      // Fix 2: Enhanced recalculateAssignments with completion tracking
      window.EnhancedFairRotationSystem.recalculateAssignments =
        async function (taskName, options = {}) {
          let taskData = this.fetchTaskData(taskName);

          if (!taskData) {
            // Try to auto-initialize from backend
            try {
              const adminEmail = localStorage.getItem("currentAdminEmail");
              if (adminEmail) {
                const response = await fetch(
                  `https://beemazing1.onrender.com/api/tasks?adminEmail=${encodeURIComponent(adminEmail)}`,
                );
                const result = await response.json();
                const tasks = result.tasks || [];

                // Find matching tasks
                const matchingTasks = tasks.filter(
                  (task) =>
                    task.title &&
                    (task.title === taskName ||
                      task.title.includes(taskName) ||
                      taskName.includes(task.title) ||
                      task.title.replace(/ - \d+(st|nd|rd|th)$/, "") ===
                        taskName),
                );

                if (matchingTasks.length > 0) {
                  const mainTask =
                    matchingTasks.find((task) => task.timesPerDay > 1) ||
                    matchingTasks[0];
                  const users = mainTask.users || [];
                  const initialOrder = mainTask.rotation?.initialOrder || users;

                  this.taskGroups[taskName] = {
                    users: users,
                    initialOrder: initialOrder,
                    completions: {},
                    assignments: {},
                    timesPerDay: mainTask.timesPerDay || 1,
                    settings: mainTask.settings || "",
                  };

                  // Import completion data
                  const today = new Date().toISOString().split("T")[0];
                  matchingTasks.forEach((task) => {
                    if (task.completions && task.completions[today]) {
                      if (!this.taskGroups[taskName].completions[today]) {
                        this.taskGroups[taskName].completions[today] = [];
                      }
                      task.completions[today].forEach((comp) => {
                        this.taskGroups[taskName].completions[today].push({
                          user: comp.user,
                          occurrenceIndex: comp.occurrenceIndex || 0,
                          time: comp.time,
                          status: comp.status || "pending",
                        });
                      });
                    }
                  });

                  taskData = this.taskGroups[taskName];
                }
              }
            } catch (error) {
              console.log(
                `⚠️ Auto-fix: Error initializing task group: ${error.message}`,
              );
            }
          }

          if (!taskData) {
            return;
          }

          // Perform completion-tracking calculation
          const today = new Date().toISOString().split("T")[0];
          const users = taskData.users || [];
          const initialOrder = taskData.initialOrder || users;
          const completions = taskData.completions[today] || [];
          const timesPerDay = taskData.timesPerDay || 4;

          // Count completions per user
          const userCompletions = {};
          users.forEach((user) => (userCompletions[user] = 0));
          completions.forEach((comp) => {
            if (userCompletions.hasOwnProperty(comp.user)) {
              userCompletions[comp.user]++;
            }
          });

          // Calculate assignments for each occurrence
          const assignments = {};
          const workingCompletions = { ...userCompletions };

          for (let occurrence = 1; occurrence <= timesPerDay; occurrence++) {
            // Check if already completed
            const existingCompletion = completions.find(
              (comp) => (comp.occurrenceIndex || 0) === occurrence - 1,
            );

            if (existingCompletion) {
              assignments[occurrence] = {
                assigned: existingCompletion.user,
                completed: true,
                completedBy: existingCompletion.user,
                time: existingCompletion.time,
              };
            } else {
              // Find next assignee using completion tracking logic
              const minCompletions = Math.min(
                ...Object.values(workingCompletions),
              );
              const candidates = users.filter(
                (user) => workingCompletions[user] === minCompletions,
              );

              let nextUser;
              if (candidates.length === 1) {
                nextUser = candidates[0];
              } else {
                // Tie-breaking logic
                if (minCompletions === 0) {
                  // Use initial order for zero completions
                  nextUser = initialOrder.find((user) =>
                    candidates.includes(user),
                  );
                } else {
                  // Use earliest completion timestamp
                  let earliestUser = candidates[0];
                  let earliestTime = Infinity;
                  completions.forEach((comp) => {
                    if (candidates.includes(comp.user)) {
                      const compTime = new Date(comp.time).getTime();
                      if (compTime < earliestTime) {
                        earliestTime = compTime;
                        earliestUser = comp.user;
                      }
                    }
                  });
                  nextUser = earliestUser;
                }
              }

              assignments[occurrence] = {
                assigned: nextUser,
                completed: false,
              };

              workingCompletions[nextUser]++;
            }
          }

          // Store assignments
          if (!taskData.assignments) {
            taskData.assignments = {};
          }
          taskData.assignments[today] = assignments;

          return assignments;
        };
      // Also patch the getAssignmentInfo function
      window.EnhancedFairRotationSystem.getAssignmentInfo = function (
        taskName,
        date,
        occurrenceIndex,
      ) {
        const taskData = this.fetchTaskData(taskName);
        if (!taskData) {
          return null;
        }

        let assignments = taskData.assignments && taskData.assignments[date];
        if (!assignments) {
          // Trigger recalculation
          this.recalculateAssignments(taskName);
          const updatedTaskData = this.fetchTaskData(taskName);
          assignments =
            updatedTaskData &&
            updatedTaskData.assignments &&
            updatedTaskData.assignments[date];
        }

        if (!assignments) {
          return null;
        }

        const occurrence = occurrenceIndex + 1;
        return assignments[occurrence] || null;
      };

      // Fix the window.allTasks dependency issue
      if (!window.allTasks || !Array.isArray(window.allTasks)) {
        window.allTasks = [];
        console.log("🔧 Auto-fix: Initialized empty window.allTasks array");
      }

      console.log(
        "✅ Enhanced Fair Rotation System auto-fix applied successfully!",
      );

      // Trigger recalculation for existing task groups
      setTimeout(() => {
        if (
          window.EnhancedFairRotationSystem &&
          window.EnhancedFairRotationSystem.taskGroups
        ) {
          Object.keys(window.EnhancedFairRotationSystem.taskGroups).forEach(
            (taskName) => {
              if (
                taskName.toLowerCase().includes("pabarot") ||
                taskName.toLowerCase().includes("suni")
              ) {
                console.log(`🔄 Auto-fix: Recalculating for ${taskName}`);
                window.EnhancedFairRotationSystem.recalculateAssignments(
                  taskName,
                );
              }
            },
          );
        }
      }, 1000);

      // Mark as patched
      window.enhancedFairRotationAutoFixed = true;
    } catch (error) {
      console.error("❌ Auto-fix failed:", error);
    }
  }

  // Apply fix when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyAutoFix);
  } else {
    applyAutoFix();
  }

  console.log("🎯 Auto-Fix Enhanced Fair Rotation System loaded and ready");
})();
