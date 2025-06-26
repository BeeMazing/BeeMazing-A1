/**
 * Apply Hybrid Timestamp Fix - Final Integration Script
 *
 * This script ensures all rotation systems in BeeMazing use the corrected
 * hybrid timestamp logic for fair task rotation.
 *
 * Fix Details:
 * - Ensures users with earliest hybrid timestamps get priority
 * - Projected assignments win over actual completions for future planning
 * - Correct order: [Armands, Artūrs, Laura] based on hybrid timestamps
 *
 * Version: 1.0
 * Fix Date: 2024-12-19
 */

(function() {
  "use strict";

  console.log("🔧 Applying Hybrid Timestamp Fix to all systems...");

  /**
   * CORRECTED: Enhanced method to get most recent engagement timestamp (actual OR projected)
   */
  function getMostRecentEngagementTimestampFixed(user, userStats, projectedAssignments) {
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

    // FIXED: Compare and return the more recent one (projected typically wins for future planning)
    const actualTime = new Date(actualCompletionTime);
    const projectedTime = new Date(mostRecentProjectedTime);

    return actualTime > projectedTime ? actualCompletionTime : mostRecentProjectedTime;
  }

  /**
   * CORRECTED: Create rotation order with proper hybrid timestamp logic
   */
  function createHybridRotationOrderFixed(users, userStats, taskTitle, projectedAssignments, initialOrder = null) {
    const fallbackOrder = initialOrder || users;

    return [...users].sort((a, b) => {
      // 1. Completion count (ascending - fewer completions go first)
      const countDiff = userStats[a].completionCount - userStats[b].completionCount;
      if (countDiff !== 0) {
        return countDiff;
      }

      // 2. HYBRID TIMESTAMP: Most recent engagement timestamp (actual OR projected)
      const aTime = getMostRecentEngagementTimestampFixed(a, userStats, projectedAssignments);
      const bTime = getMostRecentEngagementTimestampFixed(b, userStats, projectedAssignments);

      // Users with no engagements go first, maintain initial order among them
      if (!aTime && !bTime) {
        return fallbackOrder.indexOf(a) - fallbackOrder.indexOf(b);
      }
      if (!aTime) {
        return -1; // a goes first
      }
      if (!bTime) {
        return 1; // b goes first
      }

      // CRITICAL FIX: Earlier engagement times go first (less recent = higher priority)
      const timeDiff = new Date(aTime) - new Date(bTime);
      if (timeDiff !== 0) {
        return timeDiff; // Earlier timestamp gets priority
      }

      // If all else is equal, maintain initial order
      return fallbackOrder.indexOf(a) - fallbackOrder.indexOf(b);
    });
  }

  /**
   * Apply fix to EnhancedFairRotationSystem
   */
  function patchEnhancedFairRotationSystem() {
    if (window.EnhancedFairRotationSystem) {
      console.log("📦 Patching EnhancedFairRotationSystem.prototype...");

      // Patch the getMostRecentEngagementTimestamp method
      window.EnhancedFairRotationSystem.prototype.getMostRecentEngagementTimestamp = function(user, userStats, taskTitle) {
        const projectedAssignments = this.projectedAssignments ? this.projectedAssignments.get(taskTitle) || [] : [];
        return getMostRecentEngagementTimestampFixed(user, userStats, projectedAssignments);
      };

      // Ensure the system uses the correct rotation logic
      const originalCreateRotationOrder = window.EnhancedFairRotationSystem.prototype.createRotationOrder;
      window.EnhancedFairRotationSystem.prototype.createRotationOrder = function(users, userStats, taskTitle) {
        const initialOrder = this.taskInitialOrders ? this.taskInitialOrders.get(taskTitle) || users : users;
        const projectedAssignments = this.projectedAssignments ? this.projectedAssignments.get(taskTitle) || [] : [];

        return createHybridRotationOrderFixed(users, userStats, taskTitle, projectedAssignments, initialOrder);
      };

      console.log("✅ EnhancedFairRotationSystem patched successfully");
    }
  }

  /**
   * Apply fix to hybrid timestamp fix systems
   */
  function patchHybridTimestampFix() {
    if (window.hybridTimestampFix) {
      console.log("📦 Patching hybridTimestampFix...");
      window.hybridTimestampFix.getMostRecentEngagementTimestamp = getMostRecentEngagementTimestampFixed;
      window.hybridTimestampFix.createHybridRotationOrder = createHybridRotationOrderFixed;
      console.log("✅ hybridTimestampFix patched successfully");
    }
  }

  /**
   * Apply fix to immediate fix system
   */
  function patchImmediateFix() {
    if (window.immediateHybridFix) {
      console.log("📦 Patching immediateHybridFix...");
      window.immediateHybridFix.getMostRecentEngagementTimestampFixed = getMostRecentEngagementTimestampFixed;
      window.immediateHybridFix.createHybridRotationOrderFixed = createHybridRotationOrderFixed;
      console.log("✅ immediateHybridFix patched successfully");
    }
  }

  /**
   * Create global utility functions
   */
  function createGlobalUtilities() {
    // Create global function for immediate use
    window.getCorrectRotationOrder = createHybridRotationOrderFixed;

    // Create debug function for testing
    window.testHybridTimestampFix = function() {
      const testUsers = ["Artūrs", "Laura", "Armands"];
      const testUserStats = {
        Artūrs: { completionCount: 2, lastCompletionTime: "2024-06-20T10:00:00Z" },
        Laura: { completionCount: 2, lastCompletionTime: "2024-06-20T11:00:00Z" },
        Armands: { completionCount: 2, lastCompletionTime: "2024-06-20T13:00:00Z" }
      };
      const testProjectedAssignments = [
        { assignedUser: "Artūrs", date: "2024-06-21T09:00:00Z", globalOccurrence: 5 },
        { assignedUser: "Laura", date: "2024-06-21T10:00:00Z", globalOccurrence: 6 }
      ];

      const result = createHybridRotationOrderFixed(testUsers, testUserStats, "Global Task", testProjectedAssignments);
      const expected = ["Armands", "Artūrs", "Laura"];
      const isCorrect = JSON.stringify(result) === JSON.stringify(expected);

      console.log("🧪 Hybrid Timestamp Fix Test:");
      console.log("Expected:", expected);
      console.log("Actual  :", result);
      console.log("Status  :", isCorrect ? "✅ PASSED" : "❌ FAILED");

      return { result, expected, isCorrect };
    };

    console.log("✅ Global utilities created");
  }

  /**
   * Verify the fix is working
   */
  function verifyFix() {
    console.log("🧪 Verifying hybrid timestamp fix...");

    const testResult = window.testHybridTimestampFix();

    if (testResult.isCorrect) {
      console.log("✅ Hybrid timestamp fix verification PASSED");
      return true;
    } else {
      console.error("❌ Hybrid timestamp fix verification FAILED");
      return false;
    }
  }

  /**
   * Main execution function
   */
  function applyAllFixes() {
    console.log("🚀 Starting hybrid timestamp fix application...");

    // Apply patches to all systems
    patchEnhancedFairRotationSystem();
    patchHybridTimestampFix();
    patchImmediateFix();

    // Create global utilities
    createGlobalUtilities();

    // Verify the fix
    const isWorking = verifyFix();

    if (isWorking) {
      console.log("🎉 All hybrid timestamp fixes applied successfully!");
      console.log("📋 Summary of fixes:");
      console.log("  ✅ EnhancedFairRotationSystem - hybrid timestamp logic corrected");
      console.log("  ✅ hybridTimestampFix - rotation order fixed");
      console.log("  ✅ Global utilities - getCorrectRotationOrder() available");
      console.log("  ✅ Test function - testHybridTimestampFix() available");
      console.log("");
      console.log("🎯 Expected behavior:");
      console.log("  - Users with earliest hybrid timestamps get priority");
      console.log("  - Projected assignments win over actual completions");
      console.log("  - Test scenario: [Armands, Artūrs, Laura] ✅");
    } else {
      console.error("❌ Some fixes may not have been applied correctly");
    }

    return isWorking;
  }

  // Auto-execute when loaded
  if (typeof window !== 'undefined') {
    // Execute immediately if DOM is ready, otherwise wait
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyAllFixes);
    } else {
      // DOM is already ready
      setTimeout(applyAllFixes, 100); // Small delay to ensure other scripts are loaded
    }

    // Also make the function available globally
    window.applyHybridTimestampFix = applyAllFixes;
  } else {
    // Node.js environment
    applyAllFixes();
  }

  // Export for module systems
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      getMostRecentEngagementTimestampFixed,
      createHybridRotationOrderFixed,
      applyAllFixes
    };
  }

  console.log("✅ Hybrid timestamp fix script loaded successfully!");
})();
