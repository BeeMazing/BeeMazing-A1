// Test file for task exception filtering logic
// This tests the filterTasksForDate function with various exception scenarios

// Mock parseLocalDate function (corrected version to match the real implementation)
function parseLocalDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return new Date(3000, 0, 1);
    const parts = dateStr.trim().split("-");
    if (parts.length !== 3) return new Date(3000, 0, 1);
    const [year, month, day] = parts.map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return new Date(3000, 0, 1);
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) return new Date(3000, 0, 1);
    return date;
}

// Copy of the filterTasksForDate function to test
function filterTasksForDate(tasks, selectedDate) {
    if (!Array.isArray(tasks)) return [];

    const selected = parseLocalDate(selectedDate);
    const selectedDateStr = selectedDate; // Use original date string to match exception keys
    const selectedYear = selected.getFullYear();
    const selectedMonth = selected.getMonth();

    // Calculate the start of the selected week (Monday)
    const selectedWeekStart = new Date(selected);
    selectedWeekStart.setHours(0, 0, 0, 0);
    const selectedDayOfWeek = selectedWeekStart.getDay();
    const daysToMonday = selectedDayOfWeek === 0 ? 6 : selectedDayOfWeek - 1;
    selectedWeekStart.setDate(selectedWeekStart.getDate() - daysToMonday);

    return tasks.filter(task => {
        if (!task.date) return false;

        // Check if this specific date has an exception
        if (task.exceptions && task.exceptions[selectedDateStr]) {
            const exception = task.exceptions[selectedDateStr];
            
            // If deleted exception, exclude this task for this date
            if (exception.deleted) {
                return false;
            }
            
            // If modified exception, this will be handled later in the mapping
            // For now, continue with normal filtering logic
        }

        // Parse From-To range
        const range = task.date.split(" to ");
        const from = parseLocalDate(range[0]);
        const to = range[1] ? parseLocalDate(range[1]) : new Date(3000, 0, 1);
        const inRange = selected >= from && selected <= to;

        // Filter monthly tasks by specific days of month
        if (task.repeat === "Monthly" && task.monthlySchedulingType === "daysOfMonth" && task.monthlyDaysOfMonth) {
            const selectedDayOfMonth = selected.getDate();
            const allowedDays = task.monthlyDaysOfMonth.split(',').map(day => parseInt(day.trim()));
            
            // Only show if today's day of month matches one of the allowed days
            if (!allowedDays.includes(selectedDayOfMonth)) {
                return false;
            }
        }

        // Filter monthly tasks by specific days of week (e.g., 2nd Tuesday, last Friday)
        if (task.repeat === "Monthly" && task.monthlySchedulingType === "daysOfWeek" && task.monthlyDaysOfWeek) {
            const selectedDayOfWeek = selected.getDay(); // 0=Sunday, 1=Monday, etc.
            const selectedDate = selected.getDate();
            const selectedMonth = selected.getMonth();
            const selectedYear = selected.getFullYear();
            
            // Parse the monthlyDaysOfWeek format: "1:1,3:5" (1st Monday, 3rd Friday) or "2:Wednesday"
            const weekdayMap = {
                'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
                'Thursday': 4, 'Friday': 5, 'Saturday': 6
            };
            
            const allowedWeekDays = task.monthlyDaysOfWeek.split(',').map(dayData => {
                const [occurrence, weekdayStr] = dayData.split(':').map(x => x.trim());
                const weekday = isNaN(weekdayStr) ? weekdayMap[weekdayStr] : parseInt(weekdayStr);
                return { occurrence: parseInt(occurrence), weekday };
            });
            
            let matchesWeekdaySchedule = false;
            
            for (const { occurrence, weekday } of allowedWeekDays) {
                if (selectedDayOfWeek === weekday) {
                    // Calculate which occurrence of this weekday this is in the month
                    const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);
                    const firstOccurrenceOfWeekday = (weekday - firstDayOfMonth.getDay() + 7) % 7 + 1;
                    const weekOccurrence = Math.floor((selectedDate - firstOccurrenceOfWeekday) / 7) + 1;
                    
                    if (weekOccurrence === occurrence) {
                        matchesWeekdaySchedule = true;
                        break;
                    }
                }
            }
            
            if (!matchesWeekdaySchedule) {
                return false;
            }
        }

        // Skip Monthly tasks after full completion in current month
        const isMonthly = task.repeat === "Monthly";
        const monthlyRequired = task.timesPerMonth || 1;

        if (isMonthly && monthlyRequired > 0 && (task.settings?.includes("Rotation") || task.settings?.includes("Individual"))) {
            let totalCompletions = 0;
            let lastCompletionDate = null;

            const countAndTrackLastDate = (source) => {
                if (!source || typeof source !== "object") return;
                for (const dateStr in source) {
                    const d = parseLocalDate(dateStr);
                    if (d.getFullYear() === selectedYear && d.getMonth() === selectedMonth) {
                        const entries = Array.isArray(source[dateStr]) ? source[dateStr].length : 0;
                        totalCompletions += entries;
                        if (entries > 0 && (!lastCompletionDate || d > lastCompletionDate)) {
                            lastCompletionDate = d;
                        }
                    }
                }
            };

            countAndTrackLastDate(task.completions);
            countAndTrackLastDate(task.pendingCompletions);

            if (
                totalCompletions >= monthlyRequired &&
                lastCompletionDate && selected > lastCompletionDate &&
                selected.getFullYear() === selectedYear &&
                selected.getMonth() === selectedMonth
            ) {
                return false; // Hide after final completion day in same month
            }
        }

        // Skip Weekly tasks after full completion in current week
        const isWeekly = task.repeat === "Weekly";
        const weeklyRequired = task.timesPerWeek || 1;

        if (isWeekly && weeklyRequired > 0 && (task.settings?.includes("Rotation") || task.settings?.includes("Individual"))) {
            let totalCompletions = 0;
            let lastCompletionDate = null;

            const countAndTrackLastDate = (source) => {
                if (!source || typeof source !== "object") return;
                for (const dateStr in source) {
                    const d = parseLocalDate(dateStr);
                    const weekStart = new Date(d);
                    weekStart.setHours(0, 0, 0, 0);
                    const dayOfWeek = weekStart.getDay();
                    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                    weekStart.setDate(weekStart.getDate() - daysToMonday);

                    if (weekStart.getTime() === selectedWeekStart.getTime()) {
                        const entries = Array.isArray(source[dateStr]) ? source[dateStr].length : 0;
                        totalCompletions += entries;
                        if (entries > 0 && (!lastCompletionDate || d > lastCompletionDate)) {
                            lastCompletionDate = d;
                        }
                    }
                }
            };

            countAndTrackLastDate(task.completions);
            countAndTrackLastDate(task.pendingCompletions);

            if (
                totalCompletions >= weeklyRequired &&
                lastCompletionDate && selected > lastCompletionDate &&
                selected.getTime() >= selectedWeekStart.getTime()
            ) {
                return false; // Hide after final completion day in same week
            }
        }

        // Use Specific Dates first
        if (task.specificDates) {
            const specificDates = task.specificDates.split(",").map(date => date.trim());
            return specificDates.includes(selectedDateStr);
        }

        // Use Days of Week second
        if (task.daysOfWeek && !task.daysOfWeek.includes("Any")) {
            let days = task.daysOfWeek;
            if (typeof days === "string") {
                days = days.split(",").map(d => d.trim()).filter(d => d);
            }
            if (Array.isArray(days) && days.length > 0) {
                const dayOfWeek = selected.toLocaleDateString(undefined, { weekday: "long" });
                return days.includes(dayOfWeek) && inRange;
            }
        }

        // Default: From-To
        return inRange;
    }).map(task => {
        // Apply task modifications for specific dates if they exist
        if (task.exceptions && task.exceptions[selectedDateStr]) {
            const exception = task.exceptions[selectedDateStr];
            if (exception.modified && exception.task) {
                // Return the modified task for this specific date
                return {
                    ...task,
                    ...exception.task,
                    originalTask: task, // Keep reference to original for tracking
                    isModified: true
                };
            }
        }
        return task;
    });
}

// Test data
const testTasks = [
    // Regular daily task
    {
        title: "Daily Cleanup",
        date: "2024-01-01 to 2024-12-31",
        repeat: "Daily",
        users: ["Alice", "Bob"],
        reward: "5"
    },
    
    // Task with deletion exception
    {
        title: "Morning Exercise",
        date: "2024-01-01 to 2024-12-31",
        repeat: "Daily",
        users: ["Charlie"],
        exceptions: {
            "2024-03-15": { deleted: true }
        }
    },
    
    // Task with modification exception
    {
        title: "Evening Chores",
        date: "2024-01-01 to 2024-12-31",
        repeat: "Daily",
        users: ["Dave", "Eve"],
        exceptions: {
            "2024-03-20": {
                modified: true,
                task: {
                    title: "Special Event Cleanup",
                    users: ["Frank"],
                    reward: "10"
                }
            }
        }
    },
    
    // Task with multiple exceptions
    {
        title: "Kitchen Duty",
        date: "2024-01-01 to 2024-12-31",
        repeat: "Daily",
        users: ["Grace"],
        exceptions: {
            "2024-03-10": { deleted: true },
            "2024-03-25": {
                modified: true,
                task: {
                    title: "Deep Kitchen Clean",
                    users: ["Grace", "Henry"],
                    reward: "15"
                }
            }
        }
    },
    
    // Task outside date range
    {
        title: "Summer Activity",
        date: "2024-06-01 to 2024-08-31",
        repeat: "Daily",
        users: ["Ian"]
    }
];

// Test functions
function runTests() {
    console.log("🧪 Starting Task Filtering Tests...\n");
    
    let passedTests = 0;
    let totalTests = 0;
    
    function test(description, testFn) {
        totalTests++;
        try {
            const result = testFn();
            if (result) {
                console.log(`✅ ${description}`);
                passedTests++;
            } else {
                console.log(`❌ ${description}`);
            }
        } catch (error) {
            console.log(`❌ ${description} - Error: ${error.message}`);
        }
    }
    
    // Test 1: Regular task filtering
    test("Regular task appears on normal dates", () => {
        const result = filterTasksForDate(testTasks, "2024-03-01");
        return result.some(task => task.title === "Daily Cleanup");
    });
    
    // Test 2: Deletion exception
    test("Task with deletion exception is hidden on exception date", () => {
        const result = filterTasksForDate(testTasks, "2024-03-15");
        return !result.some(task => task.title === "Morning Exercise");
    });
    
    // Test 3: Deletion exception doesn't affect other dates
    test("Task with deletion exception appears on other dates", () => {
        const result = filterTasksForDate(testTasks, "2024-03-16");
        return result.some(task => task.title === "Morning Exercise");
    });
    
    // Test 4: Modification exception
    test("Task with modification exception is modified on exception date", () => {
        const result = filterTasksForDate(testTasks, "2024-03-20");
        const modifiedTask = result.find(task => task.originalTask?.title === "Evening Chores");
        return modifiedTask && modifiedTask.title === "Special Event Cleanup" && modifiedTask.isModified;
    });
    
    // Test 5: Modification exception doesn't affect other dates
    test("Task with modification exception is normal on other dates", () => {
        const result = filterTasksForDate(testTasks, "2024-03-21");
        const normalTask = result.find(task => task.title === "Evening Chores");
        return normalTask && !normalTask.isModified;
    });
    
    // Test 6: Multiple exceptions
    test("Task with multiple exceptions handles deletion correctly", () => {
        const result = filterTasksForDate(testTasks, "2024-03-10");
        return !result.some(task => task.title === "Kitchen Duty" || task.originalTask?.title === "Kitchen Duty");
    });
    
    test("Task with multiple exceptions handles modification correctly", () => {
        const result = filterTasksForDate(testTasks, "2024-03-25");
        const modifiedTask = result.find(task => task.originalTask?.title === "Kitchen Duty");
        return modifiedTask && modifiedTask.title === "Deep Kitchen Clean" && modifiedTask.isModified;
    });
    
    // Test 7: Date range filtering
    test("Task outside date range is not shown", () => {
        const result = filterTasksForDate(testTasks, "2024-01-15");
        return !result.some(task => task.title === "Summer Activity");
    });
    
    test("Task within date range is shown", () => {
        const result = filterTasksForDate(testTasks, "2024-07-15");
        return result.some(task => task.title === "Summer Activity");
    });
    
    // Test 8: Edge cases
    test("Empty task array returns empty result", () => {
        const result = filterTasksForDate([], "2024-03-01");
        return Array.isArray(result) && result.length === 0;
    });
    
    test("Task without date is filtered out", () => {
        const taskWithoutDate = [{ title: "No Date Task", users: ["Test"] }];
        const result = filterTasksForDate(taskWithoutDate, "2024-03-01");
        return result.length === 0;
    });
    
    test("Invalid task array returns empty result", () => {
        const result = filterTasksForDate(null, "2024-03-01");
        return Array.isArray(result) && result.length === 0;
    });
    
    // Test 9: Exception data integrity
    test("Modified task preserves original task reference", () => {
        const result = filterTasksForDate(testTasks, "2024-03-20");
        const modifiedTask = result.find(task => task.isModified);
        return modifiedTask && modifiedTask.originalTask && modifiedTask.originalTask.title === "Evening Chores";
    });
    
    test("Modified task has correct properties", () => {
        const result = filterTasksForDate(testTasks, "2024-03-20");
        const modifiedTask = result.find(task => task.isModified);
        return modifiedTask && 
               modifiedTask.title === "Special Event Cleanup" &&
               modifiedTask.users.includes("Frank") &&
               modifiedTask.reward === "10";
    });
    
    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log("🎉 All tests passed! The filtering logic is working correctly.");
    } else {
        console.log("⚠️  Some tests failed. Please review the implementation.");
    }
    
    return { passed: passedTests, total: totalTests };
}

// Detailed test scenarios
function runDetailedScenarios() {
    console.log("\n🔍 Running Detailed Test Scenarios...\n");
    
    // Scenario 1: Family vacation
    console.log("📅 Scenario 1: Family vacation on March 15th");
    const vacationResult = filterTasksForDate(testTasks, "2024-03-15");
    console.log(`Tasks for 2024-03-15: ${vacationResult.map(t => t.title).join(", ")}`);
    console.log(`Morning Exercise hidden: ${!vacationResult.some(t => t.title === "Morning Exercise")}`);
    
    // Scenario 2: Special event
    console.log("\n🎉 Scenario 2: Special event on March 20th");
    const eventResult = filterTasksForDate(testTasks, "2024-03-20");
    const specialTask = eventResult.find(t => t.isModified);
    console.log(`Modified task found: ${specialTask ? specialTask.title : "None"}`);
    console.log(`New users: ${specialTask ? specialTask.users.join(", ") : "None"}`);
    
    // Scenario 3: Normal day
    console.log("\n📋 Scenario 3: Normal day (March 1st)");
    const normalResult = filterTasksForDate(testTasks, "2024-03-01");
    console.log(`Tasks for normal day: ${normalResult.map(t => t.title).join(", ")}`);
    console.log(`All regular tasks present: ${normalResult.length >= 4}`);
    
    // Scenario 4: Multiple exceptions day
    console.log("\n🔄 Scenario 4: Multiple exceptions (Kitchen Duty)");
    const deletionDay = filterTasksForDate(testTasks, "2024-03-10");
    const modificationDay = filterTasksForDate(testTasks, "2024-03-25");
    const normalDay = filterTasksForDate(testTasks, "2024-03-12");
    
    console.log(`March 10 (deletion): Kitchen Duty hidden = ${!deletionDay.some(t => t.title === "Kitchen Duty")}`);
    console.log(`March 25 (modification): Kitchen Duty modified = ${modificationDay.some(t => t.isModified && t.originalTask?.title === "Kitchen Duty")}`);
    console.log(`March 12 (normal): Kitchen Duty normal = ${normalDay.some(t => t.title === "Kitchen Duty" && !t.isModified)}`);
}

// Performance test
function runPerformanceTest() {
    console.log("\n⚡ Running Performance Test...\n");
    
    // Create large dataset
    const largeTasks = [];
    for (let i = 0; i < 1000; i++) {
        largeTasks.push({
            title: `Task ${i}`,
            date: "2024-01-01 to 2024-12-31",
            repeat: "Daily",
            users: [`User${i % 10}`],
            exceptions: i % 100 === 0 ? {
                "2024-03-15": { deleted: true },
                "2024-03-20": { modified: true, task: { title: `Modified Task ${i}` } }
            } : undefined
        });
    }
    
    const startTime = Date.now();
    const result = filterTasksForDate(largeTasks, "2024-03-15");
    const endTime = Date.now();
    
    console.log(`Filtered ${largeTasks.length} tasks in ${endTime - startTime}ms`);
    console.log(`Result: ${result.length} tasks (${result.filter(t => t.isModified).length} modified)`);
    console.log(`Performance: ${(largeTasks.length / (endTime - startTime) * 1000).toFixed(0)} tasks/second`);
}

// Run all tests
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = {
        filterTasksForDate,
        runTests,
        runDetailedScenarios,
        runPerformanceTest,
        testTasks
    };
    
    // Also run tests in Node.js
    console.log("🔄 Task Exception Filtering Test Suite");
    console.log("=====================================\n");
    
    runTests();
    runDetailedScenarios();
    runPerformanceTest();
    
    console.log("\n✨ Test suite completed!");
} else {
    // Browser environment
    console.log("🔄 Task Exception Filtering Test Suite");
    console.log("=====================================\n");
    
    runTests();
    runDetailedScenarios();
    runPerformanceTest();
    
    console.log("\n✨ Test suite completed!");
}
