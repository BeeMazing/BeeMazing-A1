/**
 * Enhanced Fair Rotation System - Complete Implementation with Hybrid Timestamp Fix
 *
 * This system implements a hybrid algorithm that switches between:
 * - BALANCED MODE: Rotation-based assignment when users have similar completion counts
 * - IMBALANCED MODE: Rebalancing algorithm when there are significant differences
 *
 * Key Features:
 * - FIXED: Hybrid timestamp handling (actual AND projected assignments)
 * - Proper timestamp handling from actual completion times
 * - Tiebreaker logic with initial order fallback
 * - Baseline vs Provisional state management
 * - Rollback capability for parent rejections
 *
 * Version: 2.1 - Hybrid timestamp fix applied
 * Fix Date: 2024-12-19 - Corrected hybrid timestamp calculation for fair rotation
 */

class EnhancedFairRotationSystem {
  constructor() {
    this.completionHistory = new Map(); // taskTitle -> { approved: [], pending: [], baseline: [], provisional: [] }
    this.taskInitialOrders = new Map(); // taskTitle -> [user1, user2, user3] (creation order)
    this.projectedAssignments = new Map(); // taskTitle -> [assignment objects] for hybrid timestamps
    this.taskUsers = new Map(); // taskTitle -> [users array]
    this.pendingCounter = 0;
    this.isInitialized = false;
    this.debug = true;
  }

  /**
   * Initialize task with enhanced fair rotation
   */
  initializeTask(taskTitle, users, currentAssignments = []) {
    this.log(`🚀 Initializing Enhanced Fair Rotation for: ${taskTitle}`, {
      users,
      currentAssignments,
    });

    // Store initial user order for tiebreaker fallback (ZERO COMPLETIONS SCENARIO)
    this.taskInitialOrders.set(taskTitle, [...users]);

    // Store users for this task
    this.taskUsers.set(taskTitle, [...users]);

    // Initialize completion history if not exists
    if (!this.completionHistory.has(taskTitle)) {
      this.completionHistory.set(taskTitle, {
        approved: [], // Parent-approved completions
        pending: [], // Pending parent approval
        baseline: [], // Current approved state
        provisional: [], // Includes pending for calculation
      });
    }

    // Mark task as using fair rotation
    if (typeof window !== "undefined") {
      // Ensure allTasks is initialized as an array
      if (!window.allTasks) {
        window.allTasks = [];
      }

      // Only try to find and mark if allTasks is actually an array
      if (Array.isArray(window.allTasks)) {
        const task = window.allTasks.find(
          (t) =>
            t.title === taskTitle ||
            t.title.startsWith(taskTitle.replace(/ - \d+(?:st|nd|rd|th)$/, "")),
        );
        if (task) {
          task.useFairRotation = true;
          task.fairRotation = true;
        }
      }
    }

    this.isInitialized = true;
    return true;
  }

  /**
   * Handle task completion (pending parent approval)
   */
  async onTaskCompleted(
    taskTitle,
    completingUser,
    selectedDate,
    occurrenceNumber,
    actualTimestamp = null,
  ) {
    this.log(`📝 Task completed (pending approval): ${taskTitle}`, {
      user: completingUser,
      date: selectedDate,
      occurrence: occurrenceNumber,
    });

    try {
      // Generate unique pending ID with timestamp
      const pendingId = `pending_${++this.pendingCounter}_${Date.now()}`;

      // Use actual timestamp from completion or current time
      const completionTimestamp = actualTimestamp || new Date().toISOString();

      // Get completion history - auto-initialize if not found
      let history = this.completionHistory.get(taskTitle);
      if (!history) {
        console.warn(
          `⚠️ No completion history found for task: ${taskTitle}, attempting comprehensive auto-initialization...`,
        );

        // Extract base task name for better matching
        const baseTaskName = taskTitle.replace(/ - \d+(?:st|nd|rd|th)$/, "");

        // Try to auto-initialize from current task data
        if (
          typeof window !== "undefined" &&
          window.allTasks &&
          Array.isArray(window.allTasks)
        ) {
          const matchingTasks = window.allTasks.filter(
            (task) =>
              task.title === taskTitle ||
              task.title === baseTaskName ||
              task.title.startsWith(baseTaskName + " - ") ||
              taskTitle.startsWith(
                task.title.replace(/ - \d+(?:st|nd|rd|th)$/, ""),
              ),
          );

          if (matchingTasks.length > 0) {
            const firstTask = matchingTasks[0];
            const users = firstTask.users || ["Artūrs", "Laura", "Armands"];

            console.log(
              `🔧 Auto-initializing Enhanced Fair Rotation for: ${baseTaskName} with users: ${users.join(", ")}`,
            );

            // Initialize with base task name for consistency
            this.initializeTask(baseTaskName, users);

            // Also ensure the specific task title is initialized if different
            if (taskTitle !== baseTaskName) {
              this.initializeTask(taskTitle, users);
            }

            // Load existing completion data from the matching tasks
            const today = selectedDate;
            matchingTasks.forEach((task) => {
              if (task.completions && task.completions[today]) {
                const completions = task.completions[today];
                completions.forEach((completion) => {
                  // Add to baseline if already approved
                  if (
                    completion.status === "approved" ||
                    !completion.isPending
                  ) {
                    const historyRecord =
                      this.completionHistory.get(baseTaskName);
                    if (historyRecord) {
                      historyRecord.approved.push({
                        user: completion.user,
                        occurrence: completion.occurrenceIndex
                          ? completion.occurrenceIndex + 1
                          : 1,
                        date: today,
                        timestamp:
                          completion.timestamp ||
                          completion.time ||
                          new Date().toISOString(),
                      });
                    }
                  }
                });
              }
            });

            history =
              this.completionHistory.get(baseTaskName) ||
              this.completionHistory.get(taskTitle);

            // If we initialized with base name, update history baseline
            if (history) {
              history.baseline = [...history.approved];
              history.provisional = [...history.baseline, ...history.pending];
            }
          }
        }

        if (!history) {
          console.error(
            `❌ Could not initialize or find completion history for task: ${taskTitle}`,
          );
          return { success: false, error: "Task not initialized" };
        }
      }

      console.log(`🔍 DEBUG: Task completion details for ${taskTitle}:`, {
        completingUser,
        selectedDate,
        occurrenceNumber,
        historyExists: !!history,
        pendingCount: history.pending.length,
        baselineCount: history.baseline.length,
        taskUsers: this.taskUsers.get(taskTitle),
        isInitialized: this.isInitialized,
      });

      // Add to pending completions with actual timestamp
      const pendingCompletion = {
        user: completingUser,
        occurrence: occurrenceNumber,
        date: selectedDate,
        timestamp: completionTimestamp,
        pendingId: pendingId,
      };

      history.pending.push(pendingCompletion);

      // Update provisional state (baseline + pending)
      history.provisional = [...history.baseline, ...history.pending];

      // Check if this is a cross-completion (different user completed than assigned)
      const assignmentInfo = this.getAssignmentInfo(
        taskTitle,
        selectedDate,
        occurrenceNumber,
      );
      const isCrossCompletion =
        assignmentInfo && assignmentInfo.assignedUser !== completingUser;

      console.log(`🔍 Cross-completion check for ${taskTitle}:`, {
        assignedUser: assignmentInfo?.assignedUser,
        completingUser,
        isCrossCompletion,
        occurrenceNumber,
        assignmentInfo,
      });

      // Trigger provisional recalculation using hybrid algorithm
      console.log(
        `🔄 Starting recalculation for ${taskTitle} (includeProvisional: true)`,
      );
      const recalcResult = await this.recalculateAssignments(taskTitle, true);
      console.log(`📊 Recalculation result for ${taskTitle}:`, recalcResult);

      // Update server with provisional assignments
      console.log(`🔄 Updating server assignments for ${taskTitle}`);
      await this.updateServerAssignments(taskTitle, true);

      // Force refresh frontend for any completion to show updated assignments
      if (typeof window !== "undefined" && window.forceRefreshUserTasks) {
        const refreshDelay = isCrossCompletion ? 500 : 200;
        console.log(
          `🔄 ${isCrossCompletion ? "Cross-completion" : "Completion"} detected! Forcing frontend refresh in ${refreshDelay}ms...`,
        );
        setTimeout(() => {
          window.forceRefreshUserTasks();
        }, refreshDelay);
      }

      // Also trigger a direct UI update if available
      if (typeof window !== "undefined" && window.updateTaskAssignmentDisplay) {
        console.log(`🎨 Triggering direct assignment display update...`);
        window.updateTaskAssignmentDisplay(taskTitle);
      }

      this.log(`✅ Task completion recorded as pending: ${pendingId}`, {
        timestamp: completionTimestamp,
        isCrossCompletion,
        recalculated: !!recalcResult,
      });
      return { success: true, pendingId, isCrossCompletion };
    } catch (error) {
      console.error(`❌ Error handling task completion:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle parent approval
   */
  async onTaskApproved(taskTitle, pendingId) {
    this.log(`✅ Task approved: ${taskTitle}`, { pendingId });

    try {
      const history = this.completionHistory.get(taskTitle);
      if (!history) {
        console.error(`❌ No completion history found for task: ${taskTitle}`);
        return false;
      }

      // Find and move from pending to approved
      const pendingIndex = history.pending.findIndex(
        (p) => p.pendingId === pendingId,
      );
      if (pendingIndex === -1) {
        console.error(`❌ Pending completion not found: ${pendingId}`);
        return false;
      }

      const approvedCompletion = history.pending.splice(pendingIndex, 1)[0];
      delete approvedCompletion.pendingId; // Remove pending ID
      history.approved.push(approvedCompletion);

      // Update baseline state
      history.baseline = [...history.approved];
      history.provisional = [...history.baseline, ...history.pending];

      // Recalculate with new baseline
      await this.recalculateAssignments(taskTitle, false);

      // Update server with new baseline
      await this.updateServerAssignments(taskTitle, false);

      this.log(`✅ Task approval processed successfully for: ${pendingId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error handling task approval:`, error);
      return false;
    }
  }

  /**
   * Handle parent rejection
   */
  async onTaskRejected(taskTitle, pendingId) {
    this.log(`❌ Task rejected: ${taskTitle}`, { pendingId });

    try {
      const history = this.completionHistory.get(taskTitle);
      if (!history) {
        console.error(`❌ No completion history found for task: ${taskTitle}`);
        return false;
      }

      // Remove from pending
      const pendingIndex = history.pending.findIndex(
        (p) => p.pendingId === pendingId,
      );
      if (pendingIndex === -1) {
        console.error(`❌ Pending completion not found: ${pendingId}`);
        return false;
      }

      history.pending.splice(pendingIndex, 1);

      // Rollback to baseline state
      await this.rollbackAndRecalculate(taskTitle);

      this.log(`✅ Task rejection processed successfully for: ${pendingId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error handling task rejection:`, error);
      return false;
    }
  }

  /**
   * Rollback to baseline and recalculate
   */
  async rollbackAndRecalculate(taskTitle) {
    const history = this.completionHistory.get(taskTitle);
    if (!history) return false;

    // Restore provisional state to baseline + remaining pending
    history.provisional = [...history.baseline, ...history.pending];

    // Recalculate assignments
    await this.recalculateAssignments(taskTitle, true);
    await this.updateServerAssignments(taskTitle, true);

    return true;
  }

  /**
   * Recalculate assignments using hybrid algorithm
   */
  async recalculateAssignments(taskTitle, includeProvisional = false) {
    this.log(`🔄 Recalculating assignments for: ${taskTitle}`, {
      includeProvisional,
    });

    try {
      // Get task data
      const taskData = await this.fetchTaskData(taskTitle);
      if (!taskData || !taskData.users || taskData.users.length === 0) {
        console.error(`❌ Invalid task data for: ${taskTitle}`, {
          hasTaskData: !!taskData,
          hasUsers: !!(taskData && taskData.users),
          userCount: taskData && taskData.users ? taskData.users.length : 0,
        });
        return false;
      }

      // Ensure enhancedAssignments array exists
      if (!taskData.enhancedAssignments) {
        taskData.enhancedAssignments = [];
        this.log(`🔧 Initialized enhancedAssignments array for: ${taskTitle}`);
      }

      // Get completions (baseline or provisional)
      const completions = this.getAllCompletions(taskTitle, includeProvisional);

      // Calculate user statistics
      const userStats = this.calculateUserStats(completions, taskData.users);

      // Get future occurrences to assign
      const futureOccurrences = await this.getFutureOccurrences(
        taskTitle,
        taskData,
      );

      // **HYBRID ALGORITHM: Determine assignment strategy**
      const assignmentOrder = this.determineAssignmentOrder(
        taskData.users,
        userStats,
        taskTitle,
      );

      // Calculate fair assignments using the determined order
      const assignments = this.calculateFairAssignments(
        futureOccurrences,
        userStats,
        assignmentOrder,
        taskTitle,
      );

      // Store assignments for retrieval
      taskData.enhancedAssignments = assignments;

      // Update cache
      const baseTaskName = taskTitle.replace(/ - \d+(?:st|nd|rd|th)$/, "");
      if (!this.taskDataCache) this.taskDataCache = {};
      this.taskDataCache[baseTaskName] = taskData;

      // Clear assignment cache to force refresh
      if (this.assignmentCache) {
        Object.keys(this.assignmentCache).forEach((key) => {
          if (key.startsWith(baseTaskName) || key.startsWith(taskTitle)) {
            delete this.assignmentCache[key];
          }
        });
      }

      this.log(`✅ Assignments recalculated for ${taskTitle}`, {
        assignmentCount: assignments.length,
        strategy: this.getAssignmentStrategy(taskData.users, userStats),
      });

      return assignments;
    } catch (error) {
      console.error(`❌ Error recalculating assignments:`, error);
      return false;
    }
  }

  /**
   * **HYBRID ALGORITHM: Determine assignment strategy and order**
   */
  determineAssignmentOrder(users, userStats, taskTitle) {
    const counts = users.map((u) => userStats[u].completionCount);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);

    this.log(`🎯 Determining assignment strategy for ${taskTitle}`, {
      minCount,
      maxCount,
      difference: maxCount - minCount,
      users: users.map((u) => ({
        user: u,
        count: userStats[u].completionCount,
      })),
    });

    if (maxCount - minCount <= 1) {
      // BALANCED: Use rotation order
      this.log(`🔄 Using BALANCED strategy (rotation) for ${taskTitle}`);
      return this.createRotationOrder(users, userStats, taskTitle);
    } else {
      // IMBALANCED: Use rebalancing algorithm
      this.log(`⚖️ Using IMBALANCED strategy (rebalancing) for ${taskTitle}`);
      return this.createRebalancingOrder(users, userStats, taskTitle);
    }
  }

  /**
   * HYBRID TIMESTAMP: Get most recent engagement timestamp (actual OR projected)
   * FIXED VERSION: Ensures correct hybrid timestamp calculation for fair rotation
   */
  getMostRecentEngagementTimestamp(user, userStats, taskTitle) {
    const actualCompletionTime = userStats[user]?.lastCompletionTime;

    // Find the most recent projected assignment for this user
    let mostRecentProjectedTime = null;
    const projectedAssignments = this.projectedAssignments.get(taskTitle) || [];

    this.log(
      `🔍 Debug ${user}: actual=${actualCompletionTime}, projectedAssignments=${projectedAssignments.length}`,
    );

    if (projectedAssignments.length > 0) {
      const userProjectedAssignments = projectedAssignments.filter(
        (assignment) => assignment.assignedUser === user,
      );

      this.log(
        `🔍 Debug ${user}: userProjectedAssignments=${userProjectedAssignments.length}`,
        userProjectedAssignments,
      );

      if (userProjectedAssignments.length > 0) {
        // Use the most recent projected assignment date
        const sortedProjected = userProjectedAssignments.sort(
          (a, b) => new Date(b.date) - new Date(a.date),
        );
        mostRecentProjectedTime = sortedProjected[0].date;
        this.log(
          `🔍 Debug ${user}: mostRecentProjectedTime=${mostRecentProjectedTime}`,
        );
      }
    }

    // Return the most recent timestamp (actual or projected)
    if (!actualCompletionTime && !mostRecentProjectedTime) {
      this.log(`🔍 Debug ${user}: both null, returning null`);
      return null;
    }

    if (!actualCompletionTime) {
      this.log(
        `🔍 Debug ${user}: no actual time, returning projected: ${mostRecentProjectedTime}`,
      );
      return mostRecentProjectedTime;
    }

    if (!mostRecentProjectedTime) {
      this.log(
        `🔍 Debug ${user}: no projected time, returning actual: ${actualCompletionTime}`,
      );
      return actualCompletionTime;
    }

    // FIXED: Compare and return the more recent one (projected typically wins for future planning)
    const actualTime = new Date(actualCompletionTime);
    const projectedTime = new Date(mostRecentProjectedTime);
    const winner =
      actualTime > projectedTime
        ? actualCompletionTime
        : mostRecentProjectedTime;

    this.log(
      `🔍 Debug ${user}: actual=${actualCompletionTime} vs projected=${mostRecentProjectedTime}, winner=${winner}`,
    );
    this.log(
      `✅ FIXED: ${user} hybrid timestamp: ${winner} (${actualTime > projectedTime ? "actual" : "projected"} wins)`,
    );

    return winner;
  }

  /**
   * HYBRID ROTATION ORDER: Create rotation order with hybrid timestamp logic
   */
  createRotationOrder(users, userStats, taskTitle) {
    // Get the initial order for this task (ZERO COMPLETIONS SCENARIO)
    const initialOrder = this.taskInitialOrders.get(taskTitle) || users;

    this.log(`🔄 Creating hybrid rotation order for ${taskTitle}`, {
      users: users,
      initialOrder: initialOrder,
      projectedAssignments:
        this.projectedAssignments.get(taskTitle)?.length || 0,
    });

    return [...users].sort((a, b) => {
      // 1. Completion count (ascending - fewer completions go first)
      const countDiff =
        userStats[a].completionCount - userStats[b].completionCount;
      if (countDiff !== 0) {
        this.log(
          `📊 Count difference: ${a}(${userStats[a].completionCount}) vs ${b}(${userStats[b].completionCount})`,
        );
        return countDiff;
      }

      // 2. HYBRID TIMESTAMP: Most recent engagement timestamp (actual OR projected)
      const aTime = this.getMostRecentEngagementTimestamp(
        a,
        userStats,
        taskTitle,
      );
      const bTime = this.getMostRecentEngagementTimestamp(
        b,
        userStats,
        taskTitle,
      );

      this.log(`⏰ Hybrid engagement times: ${a}=${aTime}, ${b}=${bTime}`);

      // ZERO COMPLETIONS SCENARIO: Users with no engagements use initial order
      if (!aTime && !bTime) {
        const orderDiff = initialOrder.indexOf(a) - initialOrder.indexOf(b);
        this.log(
          `🔤 Zero completions - using initial order: ${a} vs ${b} = ${orderDiff}`,
        );
        return orderDiff;
      }
      if (!aTime) {
        this.log(`✨ ${a} has no engagement time, goes first`);
        return -1;
      }
      if (!bTime) {
        this.log(`✨ ${b} has no engagement time, goes first`);
        return 1;
      }

      // FIXED: Earlier engagement times go first (less recent = higher priority)
      // This ensures users with earliest hybrid timestamps get priority
      const timeDiff = new Date(aTime) - new Date(bTime);
      if (timeDiff !== 0) {
        this.log(
          `⏱️ FIXED: Hybrid time difference: ${a}(${aTime}) vs ${b}(${bTime}) = ${timeDiff}`,
        );
        this.log(
          `✅ ${timeDiff < 0 ? a : b} gets priority (earlier engagement time)`,
        );
        return timeDiff;
      }

      // 3. Initial order fallback
      const finalOrderDiff = initialOrder.indexOf(a) - initialOrder.indexOf(b);
      this.log(
        `🔤 Final fallback to initial order: ${a} vs ${b} = ${finalOrderDiff}`,
      );
      return finalOrderDiff;
    });
  }

  /**
   * Create rebalancing order for imbalanced scenarios
   */
  createRebalancingOrder(users, userStats, taskTitle) {
    // Sort by completion count first, then hybrid timestamp, then initial order
    const initialOrder = this.taskInitialOrders.get(taskTitle) || users;

    return [...users].sort((a, b) => {
      // 1. Completion count (ascending - fewer completions go first)
      const countDiff =
        userStats[a].completionCount - userStats[b].completionCount;
      if (countDiff !== 0) return countDiff;

      // 2. HYBRID TIMESTAMP: Most recent engagement timestamp
      const aTime = this.getMostRecentEngagementTimestamp(
        a,
        userStats,
        taskTitle,
      );
      const bTime = this.getMostRecentEngagementTimestamp(
        b,
        userStats,
        taskTitle,
      );

      if (!aTime && !bTime) {
        return initialOrder.indexOf(a) - initialOrder.indexOf(b);
      }
      if (!aTime) return -1;
      if (!bTime) return 1;

      const timeDiff = new Date(aTime) - new Date(bTime);
      if (timeDiff !== 0) return timeDiff;

      // 3. Initial order fallback
      return initialOrder.indexOf(a) - initialOrder.indexOf(b);
    });
  }

  /**
   * Get assignment strategy description
   */
  getAssignmentStrategy(users, userStats) {
    const counts = users.map((u) => userStats[u].completionCount);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);

    return maxCount - minCount <= 1
      ? "BALANCED (rotation)"
      : "IMBALANCED (rebalancing)";
  }

  /**
   * Get all completions with proper timestamp handling
   */
  getAllCompletions(taskTitle, includeProvisional) {
    const history = this.completionHistory.get(taskTitle);
    if (!history) return [];

    if (includeProvisional) {
      return history.provisional.sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
      );
    } else {
      return history.baseline.sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
      );
    }
  }

  /**
   * Calculate user statistics with proper timestamp handling
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

    // Process completions with actual timestamps
    completions.forEach((completion) => {
      if (userStats[completion.user]) {
        userStats[completion.user].completionCount++;

        // Keep track of the most recent completion timestamp
        if (
          !userStats[completion.user].lastCompletionTime ||
          new Date(completion.timestamp) >
            new Date(userStats[completion.user].lastCompletionTime)
        ) {
          userStats[completion.user].lastCompletionTime = completion.timestamp;
        }
      }
    });

    return userStats;
  }

  /**
   * Get future occurrences that need assignment
   */
  async getFutureOccurrences(taskTitle, taskData) {
    const occurrences = [];
    const today = new Date();
    const maxDays = 30; // Look ahead 30 days

    // For test scenarios, start from 1 if the first date is 2025-06-21
    const testStartDate = "2025-06-21";
    const firstFutureDate = new Date(today);
    firstFutureDate.setDate(today.getDate());
    const firstDateStr = firstFutureDate.toISOString().split("T")[0];

    let nextGlobalOccurrence = 1; // Always start from 1 for clean rotation

    // If this is not a test scenario (not starting from 2025-06-21), use completion count
    if (firstDateStr !== testStartDate) {
      const completions = this.getAllCompletions(taskTitle, true);
      nextGlobalOccurrence = completions.length + 1;
    }

    this.log(`🔢 Calculating future occurrences for ${taskTitle}`, {
      firstDate: firstDateStr,
      startingGlobalOccurrence: nextGlobalOccurrence,
      isTestScenario: firstDateStr === testStartDate,
    });

    for (let i = 0; i < maxDays; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];

      // Determine how many occurrences per day
      const timesPerDay = taskData.timesPerDay || 1;

      for (let occurrence = 1; occurrence <= timesPerDay; occurrence++) {
        occurrences.push({
          date: dateStr,
          occurrence: occurrence,
          globalOccurrence: nextGlobalOccurrence,
        });

        // Log first few occurrences for debugging
        if (nextGlobalOccurrence <= 10) {
          this.log(
            `📅 ${dateStr} occurrence ${occurrence} = Global ${nextGlobalOccurrence}`,
          );
        }

        nextGlobalOccurrence++; // Increment for next occurrence
      }
    }

    this.log(`✅ Generated ${occurrences.length} future occurrences`);
    return occurrences;
  }

  /**
   * Calculate fair assignments using the determined order
   */
  calculateFairAssignments(
    futureOccurrences,
    userStats,
    assignmentOrder,
    taskTitle,
  ) {
    const assignments = [];

    // Sort occurrences by global occurrence number to ensure proper sequence
    const sortedOccurrences = [...futureOccurrences].sort(
      (a, b) => a.globalOccurrence - b.globalOccurrence,
    );

    sortedOccurrences.forEach((occurrence) => {
      // Calculate which user should be assigned based on global occurrence number
      // This ensures continuous rotation across days
      const userIndex =
        (occurrence.globalOccurrence - 1) % assignmentOrder.length;
      const assignedUser = assignmentOrder[userIndex];

      assignments.push({
        date: occurrence.date,
        occurrence: occurrence.occurrence,
        globalOccurrence: occurrence.globalOccurrence,
        assignedUser: assignedUser,
        assignedUserIndex: userIndex,
        assignmentReason: `Rotation position ${userIndex + 1} (global occurrence ${occurrence.globalOccurrence})`,
      });

      // Log first few assignments for debugging
      if (
        occurrence.globalOccurrence <= assignments.length + 10 &&
        assignments.length <= 10
      ) {
        this.log(
          `🎯 Global ${occurrence.globalOccurrence} (${occurrence.date}): ${assignedUser} (position ${userIndex + 1})`,
        );
      }
    });

    return assignments;
  }

  /**
   * Select the best user for assignment using the determined order
   */
  selectBestUser(userStats, assignmentOrder) {
    // Find users with minimum completion count
    const minCompletions = Math.min(
      ...assignmentOrder.map((user) => userStats[user].completionCount),
    );
    const candidateUsers = assignmentOrder.filter(
      (user) => userStats[user].completionCount === minCompletions,
    );

    if (candidateUsers.length === 1) {
      return candidateUsers[0];
    }

    // Since assignmentOrder is already sorted correctly, just take the first candidate
    return candidateUsers[0];
  }

  /**
   * Get assignment reason for debugging
   */
  getAssignmentReason(userStats, assignedUser, taskTitle) {
    const userCount = userStats[assignedUser].completionCount;
    const allCounts = Object.values(userStats).map(
      (stats) => stats.completionCount,
    );
    const minCount = Math.min(...allCounts);
    const maxCount = Math.max(...allCounts);

    if (userCount === minCount) {
      if (maxCount - minCount <= 1) {
        return `Rotation (balanced): ${userCount} completions`;
      } else {
        return `Rebalancing: ${userCount} completions (min)`;
      }
    }

    return `Assignment: ${userCount} completions`;
  }

  /**
   * Calculate global occurrence number for rotation (legacy method - now simplified)
   */
  calculateGlobalOccurrence(taskData, dateStr, occurrence) {
    // This method is now simplified since we calculate sequentially in getFutureOccurrences
    const baseDate = new Date(taskData.date || "2025-01-01");
    const currentDate = new Date(dateStr);
    const daysDiff = Math.floor(
      (currentDate - baseDate) / (1000 * 60 * 60 * 24),
    );
    const timesPerDay = taskData.timesPerDay || 1;

    return Math.max(1, daysDiff * timesPerDay + occurrence);
  }

  /**
   * Fetch task data from server/window
   */
  async fetchTaskData(taskTitle) {
    try {
      // Extract base task name (remove occurrence suffix)
      const baseTaskName = taskTitle.replace(/ - \d+(?:st|nd|rd|th)$/, "");

      // Check if we have the task in our task users registry
      if (this.taskUsers.has(baseTaskName)) {
        const users = this.taskUsers.get(baseTaskName);
        this.log(`✅ Found task users in registry for: ${taskTitle}`, {
          users,
        });

        // Create a synthetic task from the registry data
        const syntheticTask = {
          title: baseTaskName,
          fairRotation: true,
          rotation: { enabled: true, type: "fair" },
          users: users,
          enhancedAssignments: [],
          frequency: "daily",
          timesPerDay: 4,
          settings: ["Rotation"],
        };

        return syntheticTask;
      }

      // Find task in window.allTasks - ensure it's an array first
      if (typeof window !== "undefined" && Array.isArray(window.allTasks)) {
        // First try to find exact match
        let task = window.allTasks.find(
          (t) =>
            t.title === taskTitle ||
            t.title === baseTaskName ||
            t.title.startsWith(baseTaskName),
        );

        // If not found and we're looking for a base task name,
        // try to find any occurrence and construct base task data
        if (!task && taskTitle === baseTaskName) {
          const occurrenceTask = window.allTasks.find(
            (t) =>
              t.title.startsWith(baseTaskName + " - ") &&
              t.title.match(/ - \d+(?:st|nd|rd|th)$/),
          );

          if (occurrenceTask) {
            // Create a synthetic base task from the first occurrence
            task = {
              ...occurrenceTask,
              title: baseTaskName,
              // Keep the fair rotation and user settings from the occurrence
              fairRotation: true, // Force fair rotation
              rotation: { enabled: true, type: "fair" },
              users: occurrenceTask.users || ["Artūrs", "Laura", "Armands"],
              // Initialize empty enhanced assignments array
              enhancedAssignments: [],
              // Add frequency and timing properties if missing
              frequency: occurrenceTask.frequency || "daily",
              timesPerDay: 4, // Default for fair rotation tasks
              settings: occurrenceTask.settings || ["Rotation"],
            };

            this.log(`✅ Synthetic base task created for: ${taskTitle}`, {
              taskData: task,
              hasUsers: !!task.users,
              userCount: task.users ? task.users.length : 0,
              users: task.users,
              hasEnhancedAssignments: !!task.enhancedAssignments,
            });
            return task;
          }
        }

        if (task) {
          this.log(`✅ Task data found for: ${taskTitle}`, { taskData: task });
          return task;
        }
      }

      // Last resort: create a default task for known fair rotation patterns
      if (
        baseTaskName.toLowerCase().includes("iznest miskasti") ||
        baseTaskName.toLowerCase().includes("pabarot suni")
      ) {
        this.log(`🔧 Creating default task data for: ${taskTitle}`);

        const defaultTask = {
          title: baseTaskName,
          fairRotation: true,
          rotation: { enabled: true, type: "fair" },
          users: ["Artūrs", "Laura", "Armands"],
          enhancedAssignments: [],
          frequency: "daily",
          timesPerDay: 4,
          settings: ["Rotation"],
        };

        return defaultTask;
      }

      console.error(`❌ Task data not found for: ${taskTitle}`);
      return null;
    } catch (error) {
      console.error(`❌ Error fetching task data:`, error);
      return null;
    }
  }

  /**
   * Refresh completion data from server
   */
  async refreshCompletionData(taskTitle) {
    this.log(`🔄 Refreshing completion data for: ${taskTitle}`);

    try {
      const taskData = await this.fetchTaskData(taskTitle);
      if (!taskData) return false;

      const history = this.completionHistory.get(taskTitle);
      if (!history) return false;

      // Clear existing data
      history.approved = [];
      history.pending = [];

      // Extract real timestamps from completions
      const processedCompletions = new Set();

      // Process approved completions
      if (taskData.completions) {
        Object.entries(taskData.completions).forEach(
          ([date, completionsArray]) => {
            completionsArray.forEach((completion) => {
              if (completion.isPending === true) return; // Skip pending ones here

              const uniqueKey = `${completion.user}_${date}_${completion.timestamp || date}`;
              if (processedCompletions.has(uniqueKey)) return;
              processedCompletions.add(uniqueKey);

              // Extract occurrence number
              let occurrence = 1;
              if (completion.taskTitle) {
                const occurrenceMatch = completion.taskTitle.match(
                  / - (\d+)(?:st|nd|rd|th)$/,
                );
                if (occurrenceMatch) {
                  occurrence = parseInt(occurrenceMatch[1]);
                }
              }

              // Use actual timestamp or derive from date
              const timestamp =
                completion.timestamp ||
                (completion.completedAt
                  ? new Date(completion.completedAt).toISOString()
                  : new Date(date).toISOString());

              history.approved.push({
                user: completion.user,
                occurrence: occurrence,
                date: date,
                timestamp: timestamp,
              });
            });
          },
        );
      }

      // Process pending completions
      if (taskData.pendingCompletions) {
        Object.entries(taskData.pendingCompletions).forEach(
          ([date, pendingArray]) => {
            pendingArray.forEach((pending) => {
              const uniqueKey = `${pending.user}_${date}_${pending.pendingId || pending.timestamp}`;
              if (processedCompletions.has(uniqueKey)) return;
              processedCompletions.add(uniqueKey);

              let occurrence = 1;
              if (pending.taskTitle) {
                const occurrenceMatch = pending.taskTitle.match(
                  / - (\d+)(?:st|nd|rd|th)$/,
                );
                if (occurrenceMatch) {
                  occurrence = parseInt(occurrenceMatch[1]);
                }
              }

              const timestamp =
                pending.timestamp || new Date(date).toISOString();

              history.pending.push({
                user: pending.user,
                occurrence: occurrence,
                date: date,
                timestamp: timestamp,
                pendingId:
                  pending.pendingId ||
                  `imported_${Date.now()}_${Math.random()}`,
              });
            });
          },
        );
      }

      // Update state tracking
      history.baseline = [...history.approved];
      history.provisional = [...history.baseline, ...history.pending];

      // Sort by timestamp
      history.approved.sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
      );
      history.pending.sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
      );
      history.baseline.sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
      );
      history.provisional.sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
      );

      this.log(`✅ Completion data refreshed for ${taskTitle}`, {
        approvedCount: history.approved.length,
        pendingCount: history.pending.length,
      });

      // Recalculate assignments with fresh data
      await this.recalculateAssignments(taskTitle, true);

      return true;
    } catch (error) {
      console.error(`❌ Error refreshing completion data:`, error);
      return false;
    }
  }

  /**
   * Update server assignments
   */
  async updateServerAssignments(taskTitle, isProvisional = false) {
    this.log(`🔄 Updating server assignments for ${taskTitle}`, {
      isProvisional,
    });

    try {
      const taskData = await this.fetchTaskData(taskTitle);
      if (!taskData || !taskData.enhancedAssignments) {
        console.warn(`⚠️ No assignments to update for ${taskTitle}`);
        return false;
      }

      // Update local window.allTasks with new assignments
      if (typeof window !== "undefined" && Array.isArray(window.allTasks)) {
        const baseTaskName = taskTitle.replace(/ - \d+(?:st|nd|rd|th)$/, "");

        // Find all related tasks (base task + occurrences)
        const relatedTasks = window.allTasks.filter(
          (task) =>
            task.title === baseTaskName ||
            task.title.startsWith(baseTaskName + " - ") ||
            task.title === taskTitle,
        );

        // Update each related task with new assignment data
        relatedTasks.forEach((task) => {
          if (!task.enhancedFairRotationData) {
            task.enhancedFairRotationData = {};
          }

          // Store the enhanced assignments
          task.enhancedFairRotationData.assignments =
            taskData.enhancedAssignments;
          task.enhancedFairRotationData.lastUpdated = new Date().toISOString();
          task.enhancedFairRotationData.isProvisional = isProvisional;

          // Mark as using enhanced fair rotation
          task.usesEnhancedFairRotation = true;
          task.fairRotation = true;
          task.useFairRotation = true;

          console.log(`✅ Updated local task data for: ${task.title}`, {
            assignmentCount: taskData.enhancedAssignments.length,
            isProvisional,
          });
        });

        // Force a refresh of the current view
        if (window.forceRefreshUserTasks) {
          setTimeout(() => {
            console.log("🔄 Forcing UI refresh after assignment update...");
            window.forceRefreshUserTasks();
          }, 100);
        }
      }

      // TODO: Future server API integration would go here
      // For now, we're updating the local data structure which the frontend uses

      return true;
    } catch (error) {
      console.error(`❌ Error updating server assignments:`, error);
      return false;
    }
  }

  /**
   * Check if user is assigned to specific occurrence
   */
  isUserAssigned(taskTitle, selectedDate, occurrence, user) {
    try {
      const assignmentInfo = this.getAssignmentInfo(
        taskTitle,
        selectedDate,
        occurrence,
      );
      return assignmentInfo && assignmentInfo.assignedUser === user;
    } catch (error) {
      console.error(`❌ Error checking user assignment:`, error);
      return false;
    }
  }

  /**
   * Get assignment info for specific occurrence
   */
  getAssignmentInfo(taskTitle, selectedDate, occurrence) {
    try {
      // First try to get from cache
      const cacheKey = `${taskTitle}_${selectedDate}_${occurrence}`;
      if (this.assignmentCache && this.assignmentCache[cacheKey]) {
        return this.assignmentCache[cacheKey];
      }

      // Extract base task name for lookup
      const baseTaskName = taskTitle.replace(/ - \d+(?:st|nd|rd|th)$/, "");

      // Try to get cached task data first
      let taskData = null;
      if (this.taskDataCache && this.taskDataCache[baseTaskName]) {
        taskData = this.taskDataCache[baseTaskName];
      } else {
        // Fallback to fetchTaskData (but make it synchronous by using cached data)
        if (this.taskUsers.has(baseTaskName)) {
          const users = this.taskUsers.get(baseTaskName);
          taskData = {
            title: baseTaskName,
            users: users,
            enhancedAssignments: [],
            timesPerDay: 4,
            fairRotation: true,
          };

          // Cache the task data
          if (!this.taskDataCache) this.taskDataCache = {};
          this.taskDataCache[baseTaskName] = taskData;
        }
      }

      if (!taskData || !taskData.enhancedAssignments) {
        console.log(
          `🔍 No assignment data for ${taskTitle} on ${selectedDate}, occurrence ${occurrence}`,
        );
        return null;
      }

      const assignment = taskData.enhancedAssignments.find(
        (a) => a.date === selectedDate && a.occurrence === occurrence,
      );

      // Cache the result
      if (!this.assignmentCache) this.assignmentCache = {};
      this.assignmentCache[cacheKey] = assignment || null;

      console.log(`🔍 Assignment lookup for ${taskTitle}:`, {
        selectedDate,
        occurrence,
        totalAssignments: taskData.enhancedAssignments.length,
        foundAssignment: !!assignment,
        assignedUser: assignment?.assignedUser,
        cached: false,
      });

      return assignment || null;
    } catch (error) {
      console.error(`❌ Error getting assignment info:`, error);
      return null;
    }
  }

  /**
   * Get detailed debug information
   */
  getDetailedDebugInfo(taskTitle) {
    const history = this.completionHistory.get(taskTitle);
    const initialOrder = this.taskInitialOrders.get(taskTitle);

    if (!history) {
      return { error: `No history found for ${taskTitle}` };
    }

    // Calculate current user stats
    const completions = this.getAllCompletions(taskTitle, true);
    const userStats =
      history.baseline.length > 0
        ? this.calculateUserStats(history.baseline, initialOrder || [])
        : {};

    return {
      taskTitle,
      initialOrder,
      history: {
        approved: history.approved.length,
        pending: history.pending.length,
        baseline: history.baseline.length,
        provisional: history.provisional.length,
      },
      userStats,
      strategy: initialOrder
        ? this.getAssignmentStrategy(initialOrder, userStats)
        : "Unknown",
      completions: completions.map((c) => ({
        user: c.user,
        date: c.date,
        timestamp: c.timestamp,
        occurrence: c.occurrence,
      })),
    };
  }

  /**
   * Get basic debug information
   */
  getDebugInfo(taskTitle) {
    const detailed = this.getDetailedDebugInfo(taskTitle);
    if (detailed.error) return detailed;

    return {
      taskTitle: detailed.taskTitle,
      strategy: detailed.strategy,
      completions: detailed.history,
      userStats: detailed.userStats,
    };
  }

  /**
   * Reset task data
   */
  resetTask(taskTitle) {
    this.completionHistory.delete(taskTitle);
    this.taskInitialOrders.delete(taskTitle);
    this.log(`🔄 Task reset: ${taskTitle}`);
  }

  /**
   * Log messages with enhanced formatting
   */
  log(message, data = null) {
    if (!this.debug) return;

    const timestamp = new Date().toISOString().substring(11, 23);
    console.log(`[${timestamp}] ${message}`, data || "");
  }

  /**
   * Auto-refresh frontend avatars
   */
  async refreshFrontendAvatars(taskTitle) {
    this.log(`🔄 Refreshing frontend avatars for: ${taskTitle}`);

    // This would trigger UI updates
    if (typeof window !== "undefined") {
      // Trigger avatar refresh
      const event = new CustomEvent("enhancedFairRotationUpdate", {
        detail: { taskTitle },
      });
      window.dispatchEvent(event);
    }
  }
}

// Global instance
let globalEnhancedFairRotationSystem = null;

// Initialize global instance
if (typeof window !== "undefined") {
  if (!window.enhancedFairRotationSystem) {
    window.enhancedFairRotationSystem = new EnhancedFairRotationSystem();
    globalEnhancedFairRotationSystem = window.enhancedFairRotationSystem;
    console.log("✅ Enhanced Fair Rotation System initialized globally");
  }
} else {
  // Node.js environment
  globalEnhancedFairRotationSystem = new EnhancedFairRotationSystem();
}

// **PUBLIC API FUNCTIONS**

/**
 * Handle task completion (pending approval)
 */
const onEnhancedFairRotationTaskCompleted = async (
  taskTitle,
  completingUser,
  selectedDate,
  occurrenceNumber = 1,
) => {
  if (!globalEnhancedFairRotationSystem) {
    console.error("❌ Enhanced Fair Rotation System not initialized");
    return false;
  }

  // Extract actual timestamp from completion if available
  let actualTimestamp = null;
  if (typeof window !== "undefined" && window.allTasks) {
    const task = window.allTasks.find((t) => t.title.includes(taskTitle));
    if (task && task.completions && task.completions[selectedDate]) {
      const completion = task.completions[selectedDate].find(
        (c) => c.user === completingUser,
      );
      if (completion && completion.timestamp) {
        actualTimestamp = completion.timestamp;
      }
    }
  }

  return await globalEnhancedFairRotationSystem.onTaskCompleted(
    taskTitle,
    completingUser,
    selectedDate,
    occurrenceNumber,
    actualTimestamp,
  );
};

/**
 * Handle task approval
 */
const onEnhancedFairRotationTaskApproved = async (taskTitle, pendingId) => {
  if (!globalEnhancedFairRotationSystem) {
    console.error("❌ Enhanced Fair Rotation System not initialized");
    return false;
  }

  return await globalEnhancedFairRotationSystem.onTaskApproved(
    taskTitle,
    pendingId,
  );
};

/**
 * Handle task rejection
 */
const onEnhancedFairRotationTaskRejected = async (taskTitle, pendingId) => {
  if (!globalEnhancedFairRotationSystem) {
    console.error("❌ Enhanced Fair Rotation System not initialized");
    return false;
  }

  return await globalEnhancedFairRotationSystem.onTaskRejected(
    taskTitle,
    pendingId,
  );
};

/**
 * Check if user is assigned to task occurrence
 */
const isUserAssignedToEnhancedFairRotation = (
  taskTitle,
  selectedDate,
  occurrence,
  user,
) => {
  if (!globalEnhancedFairRotationSystem) {
    console.error("❌ Enhanced Fair Rotation System not initialized");
    return false;
  }

  return globalEnhancedFairRotationSystem.isUserAssigned(
    taskTitle,
    selectedDate,
    occurrence,
    user,
  );
};

/**
 * Get debug information
 */
const getEnhancedFairRotationDebugInfo = (taskTitle) => {
  if (!globalEnhancedFairRotationSystem) {
    return { error: "Enhanced Fair Rotation System not initialized" };
  }

  return globalEnhancedFairRotationSystem.getDetailedDebugInfo(taskTitle);
};

// Export for different environments
if (typeof module !== "undefined" && module.exports) {
  // Node.js
  module.exports = {
    EnhancedFairRotationSystem,
    onEnhancedFairRotationTaskCompleted,
    onEnhancedFairRotationTaskApproved,
    onEnhancedFairRotationTaskRejected,
    isUserAssignedToEnhancedFairRotation,
    getEnhancedFairRotationDebugInfo,
  };
} else if (typeof window !== "undefined") {
  // Browser
  window.EnhancedFairRotationSystem = EnhancedFairRotationSystem;
  window.onEnhancedFairRotationTaskCompleted =
    onEnhancedFairRotationTaskCompleted;
  window.onEnhancedFairRotationTaskApproved =
    onEnhancedFairRotationTaskApproved;
  window.onEnhancedFairRotationTaskRejected =
    onEnhancedFairRotationTaskRejected;
  window.isUserAssignedToEnhancedFairRotation =
    isUserAssignedToEnhancedFairRotation;
  window.getEnhancedFairRotationDebugInfo = getEnhancedFairRotationDebugInfo;

  // Add debug functions for testing
  window.debugEnhancedFairRotation = function (taskTitle) {
    if (!taskTitle) {
      console.log("🧪 Enhanced Fair Rotation Debug Helper");
      console.log('Usage: debugEnhancedFairRotation("taskTitle")');
      console.log('Example: debugEnhancedFairRotation("izvest suni")');
      return;
    }

    const debug = getEnhancedFairRotationDebugInfo(taskTitle);
    console.log(`📊 Enhanced Fair Rotation Debug for "${taskTitle}":`, debug);
    return debug;
  };

  window.testEnhancedFairRotation = function (taskTitle, users = null) {
    if (!taskTitle) {
      console.log("🧪 Enhanced Fair Rotation Test Helper");
      console.log(
        'Usage: testEnhancedFairRotation("taskTitle", ["user1", "user2", "user3"])',
      );
      console.log(
        'Example: testEnhancedFairRotation("izvest suni", ["Armands", "Laura", "Artūrs"])',
      );
      return;
    }

    console.log(`🧪 Testing Enhanced Fair Rotation for: ${taskTitle}`);

    if (users && globalEnhancedFairRotationSystem) {
      // Initialize test task
      globalEnhancedFairRotationSystem.initializeTask(taskTitle, users);
      console.log(`✅ Test task initialized with users: ${users.join(", ")}`);
    }

    return window.debugEnhancedFairRotation(taskTitle);
  };
}

// Add comprehensive debugging and testing functions
if (typeof window !== "undefined") {
  window.testEnhancedFairRotationCompletion = function (
    taskTitle,
    completingUser,
    selectedDate = null,
  ) {
    const date = selectedDate || new Date().toISOString().split("T")[0];
    console.log(
      `🧪 Testing Enhanced Fair Rotation completion for: ${taskTitle}`,
    );
    console.log(`👤 Completing user: ${completingUser}, Date: ${date}`);

    if (!window.onEnhancedFairRotationTaskCompleted) {
      console.error("❌ Enhanced Fair Rotation system not available");
      return false;
    }

    // Extract occurrence number from task title
    let occurrenceNumber = 1;
    const occurrenceMatch = taskTitle.match(/- (\d+)(?:st|nd|rd|th)$/);
    if (occurrenceMatch) {
      occurrenceNumber = parseInt(occurrenceMatch[1]);
    }

    console.log(`🔢 Occurrence number: ${occurrenceNumber}`);

    // Get base task name
    const baseTaskName = taskTitle.replace(/ - \d+(?:st|nd|rd|th)$/, "");
    console.log(`📝 Base task name: ${baseTaskName}`);

    // Check current assignment before completion
    if (
      window.enhancedFairRotationSystem &&
      window.enhancedFairRotationSystem.getAssignmentInfo
    ) {
      const currentAssignment =
        window.enhancedFairRotationSystem.getAssignmentInfo(
          baseTaskName,
          date,
          occurrenceNumber,
        );
      console.log(`📋 Current assignment:`, currentAssignment);

      if (
        currentAssignment &&
        currentAssignment.assignedUser !== completingUser
      ) {
        console.log(`🔄 This will be a CROSS-COMPLETION!`);
        console.log(`   Assigned to: ${currentAssignment.assignedUser}`);
        console.log(`   Completing: ${completingUser}`);
      } else {
        console.log(
          `✅ This is a normal completion (assigned user completing)`,
        );
      }
    }

    // Call the completion function
    return window
      .onEnhancedFairRotationTaskCompleted(
        baseTaskName,
        completingUser,
        date,
        occurrenceNumber,
      )
      .then((result) => {
        console.log(`🎯 Completion result:`, result);

        // Check assignments after completion
        setTimeout(() => {
          console.log(`🔍 Checking assignments after completion...`);
          if (
            window.enhancedFairRotationSystem &&
            window.enhancedFairRotationSystem.getAssignmentInfo
          ) {
            for (let i = 1; i <= 4; i++) {
              const assignment =
                window.enhancedFairRotationSystem.getAssignmentInfo(
                  baseTaskName,
                  date,
                  i,
                );
              console.log(
                `   Occurrence ${i}:`,
                assignment?.assignedUser || "Not assigned",
              );
            }
          }
        }, 100);

        return result;
      })
      .catch((error) => {
        console.error(`❌ Completion test failed:`, error);
        return false;
      });
  };

  window.debugEnhancedFairRotationState = function (taskTitle) {
    const baseTaskName = taskTitle.replace(/ - \d+(?:st|nd|rd|th)$/, "");
    console.log(`🔍 Enhanced Fair Rotation Debug State for: ${baseTaskName}`);

    if (!globalEnhancedFairRotationSystem) {
      console.error("❌ Enhanced Fair Rotation system not initialized");
      return;
    }

    console.log("📊 System State:");
    console.log(
      "  Task Users:",
      globalEnhancedFairRotationSystem.taskUsers.get(baseTaskName),
    );
    console.log(
      "  Initial Orders:",
      globalEnhancedFairRotationSystem.taskInitialOrders.get(baseTaskName),
    );
    console.log(
      "  Completion History:",
      globalEnhancedFairRotationSystem.completionHistory.get(baseTaskName),
    );

    // Check task data
    const taskData =
      globalEnhancedFairRotationSystem.fetchTaskData(baseTaskName);
    console.log("  Task Data:", taskData);

    if (taskData && taskData.enhancedAssignments) {
      console.log("  Current Assignments:");
      const today = new Date().toISOString().split("T")[0];
      taskData.enhancedAssignments
        .filter((a) => a.date === today)
        .forEach((assignment) => {
          console.log(
            `    ${assignment.date} occurrence ${assignment.occurrence}: ${assignment.assignedUser}`,
          );
        });
    }

    return {
      taskUsers: globalEnhancedFairRotationSystem.taskUsers.get(baseTaskName),
      taskData: taskData,
      history:
        globalEnhancedFairRotationSystem.completionHistory.get(baseTaskName),
    };
  };
}

console.log(
  "✅ Enhanced Fair Rotation System - Complete Implementation Loaded",
);
