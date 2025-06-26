(function () {
  "use strict";

  console.log("🔧 Loading Immediate Hybrid Timestamp Fix...");

  // CORRECTED: Enhanced method to get most recent engagement timestamp (actual OR projected)
  function getMostRecentEngagementTimestampFixed(
    user,
    userStats,
    projectedAssignments,
  ) {
    const actualCompletionTime = userStats[user]?.lastCompletionTime;

    // Find the most recent projected assignment for this user
    let mostRecentProjectedTime = null;
    if (projectedAssignments && projectedAssignments.length > 0) {
      const userProjectedAssignments = projectedAssignments.filter(
        (assignment) => assignment.assignedUser === user,
      );

      if (userProjectedAssignments.length > 0) {
        // Use the most recent projected assignment date
        const sortedProjected = userProjectedAssignments.sort(
          (a, b) => new Date(b.date) - new Date(a.date),
        );
        mostRecentProjectedTime = sortedProjected[0].date;
      }
    }

    // Return the most recent timestamp (actual or projected)
    if (!actualCompletionTime && !mostRecentProjectedTime) {
      return null;
    }

    if (!actualCompletionTime) {
      return mostRecentProjectedTime;
    }

    if (!mostRecentProjectedTime) {
      return actualCompletionTime;
    }

    // Compare and return the more recent one (projected typically wins for future planning)
    const actualTime = new Date(actualCompletionTime);
    const projectedTime = new Date(mostRecentProjectedTime);

    return actualTime > projectedTime
      ? actualCompletionTime
      : mostRecentProjectedTime;
  }

  // CORRECTED: Create rotation order with proper hybrid timestamp logic
  function createHybridRotationOrderFixed(
    users,
    userStats,
    taskTitle,
    projectedAssignments,
    initialOrder = null,
  ) {
    const fallbackOrder = initialOrder || users;

    console.log(`🔄 Creating FIXED hybrid rotation order for ${taskTitle}`);

    return [...users].sort((a, b) => {
      // 1. Completion count (ascending - fewer completions go first)
      const countDiff =
        userStats[a].completionCount - userStats[b].completionCount;
      if (countDiff !== 0) {
        return countDiff;
      }

      // 2. Most recent engagement timestamp (actual OR projected)
      const aTime = getMostRecentEngagementTimestampFixed(
        a,
        userStats,
        projectedAssignments,
      );
      const bTime = getMostRecentEngagementTimestampFixed(
        b,
        userStats,
        projectedAssignments,
      );

      // Users with no engagements go first, maintain initial order among them
      if (!aTime && !bTime) {
        const orderDiff = fallbackOrder.indexOf(a) - fallbackOrder.indexOf(b);
        return orderDiff;
      }
      if (!aTime) {
        return -1; // a goes first
      }
      if (!bTime) {
        return 1; // b goes first
      }

      // CRITICAL: Earlier engagement times go first (less recent = higher priority)
      const timeDiff = new Date(aTime) - new Date(bTime);
      if (timeDiff !== 0) {
        return timeDiff; // Earlier timestamp gets priority
      }

      // If all else is equal, maintain initial order
      const finalOrderDiff = fallbackOrder.indexOf(a) - fallbackOrder.indexOf(b);
      return finalOrderDiff;
    });
  }

  // TEST: Verify the fix works with the exact scenario
  function testImmediateFix() {
    console.log("\n🎯 Testing Immediate Fix:");
    console.log("==========================");

    const realUsers = ["Artūrs", "Laura", "Armands"];
    const realUserStats = {
      Artūrs: {
        completionCount: 2,
        lastCompletionTime: "2024-06-20T10:00:00Z", // Global 1
      },
      Laura: {
        completionCount: 2,
        lastCompletionTime: "2024-06-20T11:00:00Z", // Global 2
      },
      Armands: {
        completionCount: 2,
        lastCompletionTime: "2024-06-20T13:00:00Z", // Global 4 (most recent actual)
      },
    };

    const realProjectedAssignments = [
      {
        assignedUser: "Artūrs",
        date: "2024-06-21T09:00:00Z", // Global 5 projected
        globalOccurrence: 5,
      },
      {
        assignedUser: "Laura",
        date: "2024-06-21T10:00:00Z", // Global 6 projected
        globalOccurrence: 6,
      },
      // Armands has no projected assignment
    ];

    console.log("Expected hybrid timestamps:");
    console.log("- Artūrs: 2024-06-21T09:00:00Z (projected wins)");
    console.log("- Laura: 2024-06-21T10:00:00Z (projected wins)");
    console.log("- Armands: 2024-06-20T13:00:00Z (actual only)");
    console.log("\nExpected order: [Armands, Artūrs, Laura] (earliest timestamp first)");

    const result = createHybridRotationOrderFixed(
      realUsers,
      realUserStats,
      "Global Task",
      realProjectedAssignments
    );

    console.log("\n🎯 IMMEDIATE FIX RESULT:");
    console.log("Expected: [Armands, Artūrs, Laura]");
    console.log("Actual  :", result);
    console.log("Status  :", JSON.stringify(result) === JSON.stringify(["Armands", "Artūrs", "Laura"]) ? "✅ FIXED!" : "❌ Still broken");

    return result;
  }

  // PATCH: Apply the fix to existing systems
  function applyImmediateFix() {
    console.log("🔧 Applying immediate fix to all systems...");

    // Patch the standalone hybrid fix
    if (window.hybridTimestampFix) {
      console.log("📦 Patching hybridTimestampFix...");
      window.hybridTimestampFix.getMostRecentEngagementTimestamp = getMostRecentEngagementTimestampFixed;
      window.hybridTimestampFix.createHybridRotationOrder = createHybridRotationOrderFixed;
    }

    // Patch the EnhancedFairRotationSystem
    if (window.EnhancedFairRotationSystem) {
      console.log("📦 Patching EnhancedFairRotationSystem...");
      window.EnhancedFairRotationSystem.prototype.getMostRecentEngagementTimestamp = function(user, userStats, taskTitle) {
        const projectedAssignments = this.projectedAssignments.get(taskTitle) || [];
        return getMostRecentEngagementTimestampFixed(user, userStats, projectedAssignments);
      };
    }

    // Create a new global function for immediate use
    window.getCorrectRotationOrder = function(users, userStats, taskTitle, projectedAssignments) {
      return createHybridRotationOrderFixed(users, userStats, taskTitle, projectedAssignments);
    };

    console.log("✅ Immediate fix applied to all systems!");
  }

  // AUTO-EXECUTE: Run the test and apply fixes
  console.log("🚀 Auto-executing immediate fix...");
  testImmediateFix();
  applyImmediateFix();

  // EXPORT: Make functions available globally
  window.immediateHybridFix = {
    getMostRecentEngagementTimestampFixed,
    createHybridRotationOrderFixed,
    testImmediateFix,
    applyImmediateFix,
  };

  console.log("✅ Immediate Hybrid Timestamp Fix loaded and applied!");
})();
