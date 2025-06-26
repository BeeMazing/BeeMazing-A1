/**
 * Initialize Fair Rotation Tasks
 * Ensures proper integration with existing task system and fair rotation logic
 */

(function () {
  "use strict";

  console.log("🚀 Initializing Fair Rotation Tasks Integration...");

  // Task initialization and integration
  function initializeFairRotationTasks() {
    // Ensure window.allTasks exists
    if (!Array.isArray(window.allTasks)) {
      window.allTasks = [];
    }

    // Define fair rotation tasks configuration
    const fairRotationTasks = [
      {
        title: "pabarot suni",
        users: ["Artūrs", "Laura", "Armands"],
        timesPerDay: 4,
        useFairRotation: true,
        fairRotation: true,
        type: "recurring",
        rotationType: "fair",
        baseDate: "2025-06-21",
      },
    ];

    // Initialize each fair rotation task
    fairRotationTasks.forEach((taskConfig) => {
      let existingTask = window.allTasks.find(
        (t) =>
          t.title === taskConfig.title || t.title.startsWith(taskConfig.title),
      );

      if (!existingTask) {
        // Create new task
        window.allTasks.push({ ...taskConfig });
        console.log(`✅ Created fair rotation task: ${taskConfig.title}`);
      } else {
        // Update existing task
        Object.assign(existingTask, taskConfig);
        console.log(`✅ Updated fair rotation task: ${taskConfig.title}`);
      }
    });

    console.log(`📋 Total tasks in system: ${window.allTasks.length}`);
  }

  // Enhanced fair rotation calculator that works with existing data
  class TaskDataIntegrator {
    constructor() {
      this.debug = true;
    }

    log(message, data = null) {
      if (this.debug) {
        console.log(`[TaskIntegrator] ${message}`, data ? data : "");
      }
    }

    // Get task data from various sources
    getTaskData(taskTitle) {
      try {
        const baseTaskName = taskTitle.replace(/ - \d+(?:st|nd|rd|th)$/, "");

        // Try window.allTasks first
        if (Array.isArray(window.allTasks)) {
          const task = window.allTasks.find(
            (t) =>
              t.title === baseTaskName ||
              t.title === taskTitle ||
              t.title.startsWith(baseTaskName),
          );
          if (task) {
            this.log(`Found task in allTasks: ${baseTaskName}`);
            return task;
          }
        }

        // Try the taskrotations.js data
        if (typeof window !== "undefined" && window.tasks) {
          const task = window.tasks.find(
            (t) => t.title === baseTaskName || t.title === taskTitle,
          );
          if (task) {
            this.log(`Found task in window.tasks: ${baseTaskName}`);
            return task;
          }
        }

        // Create default task data for known fair rotation tasks
        if (baseTaskName === "pabarot suni") {
          const defaultTask = {
            title: baseTaskName,
            users: ["Artūrs", "Laura", "Armands"],
            timesPerDay: 4,
            useFairRotation: true,
            fairRotation: true,
          };
          this.log(`Created default task data for: ${baseTaskName}`);
          return defaultTask;
        }

        return null;
      } catch (error) {
        this.log(`❌ Error getting task data: ${error.message}`);
        return null;
      }
    }

    // Get completions for a task
    getTaskCompletions(baseTaskName, dateStr) {
      const completions = [];

      try {
        // Check completedDates array
        if (Array.isArray(window.completedDates)) {
          window.completedDates.forEach((completion) => {
            if (completion.date === dateStr && completion.task) {
              if (
                completion.task === baseTaskName ||
                completion.task.startsWith(baseTaskName + " - ")
              ) {
                completions.push({
                  user: completion.user,
                  task: completion.task,
                  timestamp:
                    completion.timestamp ||
                    completion.completedAt ||
                    new Date().toISOString(),
                  source: "completedDates",
                });
              }
            }
          });
        }

        // Check completions array if it exists
        if (Array.isArray(window.completions)) {
          window.completions.forEach((completion) => {
            if (completion.date === dateStr && completion.task) {
              if (
                completion.task === baseTaskName ||
                completion.task.startsWith(baseTaskName + " - ")
              ) {
                completions.push({
                  user: completion.user,
                  task: completion.task,
                  timestamp:
                    completion.timestamp ||
                    completion.completedAt ||
                    new Date().toISOString(),
                  source: "completions",
                });
              }
            }
          });
        }

        this.log(
          `Found ${completions.length} completions for ${baseTaskName} on ${dateStr}`,
        );
        return completions.sort((a, b) => {
          return (
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        });
      } catch (error) {
        this.log(`❌ Error getting completions: ${error.message}`);
        return [];
      }
    }

    // Calculate fair rotation order based on completions
    calculateFairRotationOrder(users, completions, baseTaskName, dateStr) {
      try {
        this.log(
          `🔄 Calculating fair rotation for ${baseTaskName} on ${dateStr}`,
        );

        // Create user priority scores (lower = higher priority)
        const userScores = {};
        users.forEach((user, index) => {
          userScores[user] = index * 1000; // Base score based on order
        });

        // Adjust scores based on completions
        completions.forEach((completion, index) => {
          if (userScores.hasOwnProperty(completion.user)) {
            // Users who completed tasks get priority boost based on completion time
            const timestamp = new Date(completion.timestamp).getTime();
            userScores[completion.user] = timestamp;
          }
        });

        // Sort users by score (lower score = higher priority)
        const sortedUsers = users.slice().sort((a, b) => {
          return userScores[a] - userScores[b];
        });

        this.log(`✅ Fair rotation order: ${sortedUsers.join(" → ")}`);
        return sortedUsers;
      } catch (error) {
        this.log(`❌ Error calculating fair rotation: ${error.message}`);
        return users;
      }
    }

    // Get assignment for a specific occurrence
    getAssignmentForOccurrence(taskTitle, dateStr, occurrenceIndex) {
      try {
        // Ensure taskTitle is a string
        if (typeof taskTitle !== "string") {
          this.log(
            `❌ Error getting assignment: taskTitle is not a string: ${typeof taskTitle}`,
          );
          return null;
        }

        // Ensure taskTitle is not empty
        if (!taskTitle || taskTitle.trim() === "") {
          this.log(
            `❌ Error getting assignment: taskTitle is empty or whitespace`,
          );
          return null;
        }

        const baseTaskName = taskTitle.replace(/ - \d+(?:st|nd|rd|th)$/, "");
        const taskData = this.getTaskData(baseTaskName);

        if (!taskData || !taskData.useFairRotation) {
          return null; // Let existing system handle it
        }

        const users = taskData.users || ["Artūrs", "Laura", "Armands"];
        const completions = this.getTaskCompletions(baseTaskName, dateStr);

        // Calculate fair rotation order
        const fairOrder = this.calculateFairRotationOrder(
          users,
          completions,
          baseTaskName,
          dateStr,
        );

        // Return assignment for this occurrence
        const assignedUser = fairOrder[occurrenceIndex % fairOrder.length];

        this.log(
          `📋 Assignment for ${taskTitle} occurrence ${occurrenceIndex + 1}: ${assignedUser}`,
        );
        return assignedUser;
      } catch (error) {
        this.log(`❌ Error getting assignment: ${error.message}`);
        return null;
      }
    }
  }

  // Create global integrator instance
  window.TaskDataIntegrator = new TaskDataIntegrator();

  // Override getCurrentAssignee to use fair rotation when appropriate
  function enhanceGetCurrentAssignee() {
    if (typeof window.getCurrentAssignee === "function") {
      const originalGetCurrentAssignee = window.getCurrentAssignee;

      window.getCurrentAssignee = function (
        taskTitleOrObject,
        dateStr,
        occurrenceIndex = 0,
      ) {
        try {
          // Handle both task object and string parameters
          let taskTitle;
          if (
            typeof taskTitleOrObject === "object" &&
            taskTitleOrObject &&
            taskTitleOrObject.title
          ) {
            taskTitle = taskTitleOrObject.title;
          } else if (typeof taskTitleOrObject === "string") {
            taskTitle = taskTitleOrObject;
          } else {
            console.log(
              `[TaskIntegrator] ❌ Error getting assignment: taskTitle is not a string or object: ${typeof taskTitleOrObject}`,
            );
            // Fall back to original function with original parameters
            try {
              return originalGetCurrentAssignee.call(
                this,
                taskTitleOrObject,
                dateStr,
                occurrenceIndex,
              );
            } catch (fallbackError) {
              console.error(
                "❌ Fallback to original getCurrentAssignee also failed:",
                fallbackError,
              );
              return null;
            }
          }

          // Try fair rotation first only if we have a valid task title
          if (taskTitle) {
            const fairAssignment =
              window.TaskDataIntegrator.getAssignmentForOccurrence(
                taskTitle,
                dateStr,
                occurrenceIndex,
              );

            if (fairAssignment) {
              return fairAssignment;
            }
          }

          // Fall back to original function - pass the original parameter
          return originalGetCurrentAssignee.call(
            this,
            taskTitleOrObject,
            dateStr,
            occurrenceIndex,
          );
        } catch (error) {
          console.error("❌ Error in enhanced getCurrentAssignee:", error);
          return originalGetCurrentAssignee.call(
            this,
            taskTitle,
            dateStr,
            occurrenceIndex,
          );
        }
      };

      console.log("✅ Enhanced getCurrentAssignee with fair rotation support");
    } else {
      // Create getCurrentAssignee if it doesn't exist
      window.getCurrentAssignee = function (
        taskTitleOrObject,
        dateStr,
        occurrenceIndex = 0,
      ) {
        // Handle both task object and string parameters
        let taskTitle;
        if (
          typeof taskTitleOrObject === "object" &&
          taskTitleOrObject &&
          taskTitleOrObject.title
        ) {
          taskTitle = taskTitleOrObject.title;
        } else if (typeof taskTitleOrObject === "string") {
          taskTitle = taskTitleOrObject;
        } else {
          console.log(
            `[TaskIntegrator] ❌ Error getting assignment: taskTitle is not a string or object: ${typeof taskTitleOrObject}`,
          );
          return null;
        }

        if (!taskTitle) {
          console.log(
            `[TaskIntegrator] ❌ Error getting assignment: taskTitle is empty or invalid`,
          );
          return null;
        }

        return window.TaskDataIntegrator.getAssignmentForOccurrence(
          taskTitle,
          dateStr,
          occurrenceIndex,
        );
      };
      console.log("✅ Created getCurrentAssignee with fair rotation support");
    }
  }

  // Integration with Enhanced Fair Rotation System
  function integrateWithEnhancedSystem() {
    if (window.EnhancedFairRotationSystem) {
      const originalFetchTaskData =
        window.EnhancedFairRotationSystem.fetchTaskData;

      window.EnhancedFairRotationSystem.fetchTaskData = function (taskTitle) {
        try {
          // Try original method first
          const result = originalFetchTaskData.call(this, taskTitle);
          if (result) {
            return result;
          }

          // Fall back to integrator
          return window.TaskDataIntegrator.getTaskData(taskTitle);
        } catch (error) {
          console.error("❌ Error in enhanced fetchTaskData:", error);
          return window.TaskDataIntegrator.getTaskData(taskTitle);
        }
      };

      console.log("✅ Integrated with EnhancedFairRotationSystem");
    }
  }

  // Initialize everything when DOM is ready
  function initialize() {
    try {
      // Initialize fair rotation tasks
      initializeFairRotationTasks();

      // Enhance getCurrentAssignee
      enhanceGetCurrentAssignee();

      // Integrate with enhanced system
      integrateWithEnhancedSystem();

      console.log("✅ Fair Rotation Tasks Integration completed successfully!");
    } catch (error) {
      console.error("❌ Error during initialization:", error);
    }
  }

  // Run initialization
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    // DOM already loaded
    setTimeout(initialize, 100);
  }

  // Add test function for debugging
  window.testFairRotationIntegration = function () {
    console.log("🧪 Testing Fair Rotation Integration...");

    const integrator = window.TaskDataIntegrator;
    const testDate = "2025-06-21";
    const testTask = "pabarot suni";

    // Test task data retrieval
    const taskData = integrator.getTaskData(testTask);
    console.log("📋 Task data:", taskData);

    // Test completions retrieval
    const completions = integrator.getTaskCompletions(testTask, testDate);
    console.log("📋 Completions:", completions);

    // Test assignments for each occurrence
    for (let i = 0; i < 4; i++) {
      const assignment = integrator.getAssignmentForOccurrence(
        `${testTask} - ${i + 1}st`,
        testDate,
        i,
      );
      console.log(`📋 Task ${i + 1} assignment: ${assignment}`);
    }

    // Test getCurrentAssignee function
    if (typeof window.getCurrentAssignee === "function") {
      for (let i = 0; i < 4; i++) {
        const assignment = window.getCurrentAssignee(
          `${testTask} - ${i + 1}st`,
          testDate,
          i,
        );
        console.log(`📋 getCurrentAssignee Task ${i + 1}: ${assignment}`);
      }
    }

    console.log("✅ Integration test completed");
  };

  console.log("✅ Fair Rotation Tasks Integration script loaded");
  console.log("🧪 Run testFairRotationIntegration() to test the system");
})();
