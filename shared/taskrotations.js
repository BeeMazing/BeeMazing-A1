// Parse a date string (e.g., "2025-04-30") into a Date object
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

// Filter tasks for a given date, returning only those that should be visible
function filterTasksForDate(tasks, selectedDate) {
    if (!Array.isArray(tasks)) return [];

    // Convert selectedDate to a Date object and format as YYYY-MM-DD
    const selected = parseLocalDate(selectedDate);
    const selectedDateStr = selected.toISOString().split("T")[0];

    return tasks.filter(task => {
        if (!task.date) return false;

        // Parse the From/To range
        const range = task.date.split(" to ");
        const from = parseLocalDate(range[0]);
        const to = range[1] ? parseLocalDate(range[1]) : new Date(3000, 0, 1);

        const inRange = selected >= from && selected <= to;

        // If Specific Dates exist, use that first
        if (task.specificDates) {
            const specificDates = task.specificDates.split(",").map(date => date.trim());
            return specificDates.includes(selectedDateStr);
        }

        // If Days of Week exist, use that second
        if (task.daysOfWeek && !task.daysOfWeek.includes("Any")) {
            let days = task.daysOfWeek;
            if (typeof days === "string") {
                days = days.split(",").map(d => d.trim()).filter(d => d);
            }
            if (Array.isArray(days) && days.length > 0) {
                const dayOfWeek = selected.toLocaleDateString(undefined, { weekday: "long" });
                return days.includes(dayOfWeek) && inRange; // Must be within From-To range
            }
        }

        // Default case: From-To (if "Any" or no specific days)
        return inRange;
    });
}



// addtasks.html settings: Rotation ////////////////////////////////////////////////////////////////////////






function mixedTurnOffset(task, selectedDate) {
    const repeat = task.repeat || "Daily";
    const requiredTimes = repeat === "Daily" ? (Number.isInteger(task.timesPerDay) ? task.timesPerDay : 1)
                      : repeat === "Weekly" ? (Number.isInteger(task.timesPerWeek) ? task.timesPerWeek : 1)
                      : repeat === "Monthly" ? (Number.isInteger(task.timesPerMonth) ? task.timesPerMonth : 1)
                      : 1;

    const range = task.date.split(" to ");
    const taskStartDate = parseLocalDate(range[0]);
    const selected = parseLocalDate(selectedDate);

    if (isNaN(taskStartDate.getTime()) || isNaN(selected.getTime())) {
        return 0;
    }

    const assignedUsers = task.users || [];
    if (assignedUsers.length === 0) return 0;

    let rotationOffset = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day

    // Go from start date up to selected date (inclusive)
    for (
        let currentDate = new Date(taskStartDate);
        currentDate <= selected;
        currentDate.setDate(currentDate.getDate() + 1)
    ) {
        const dateStr = currentDate.toISOString().split("T")[0];
        const isCurrentDate = dateStr === selectedDate;
        const isFutureDate = currentDate > today;
        const isToday = currentDate.toDateString() === today.toDateString();

        let completedCount = 0;

        // For past and current day, check actual completions
        if (!isFutureDate) {
            const completionsOnDay = Array.isArray(task.completions?.[dateStr]) ? task.completions[dateStr] : [];
            const pendingOnDay = Array.isArray(task.pendingCompletions?.[dateStr]) ? task.pendingCompletions[dateStr] : [];
            completedCount = completionsOnDay.length + pendingOnDay.length;
        }

        // ✅ For future dates: Assume full completion (requiredTimes) for days before selectedDate
        if (isFutureDate && !isCurrentDate) {
            rotationOffset += requiredTimes;
        }
        // ✅ For past dates or today (if fully completed): Count full turns
        else if (!isCurrentDate || (isToday && completedCount >= requiredTimes)) {
            rotationOffset += completedCount >= requiredTimes ? requiredTimes : completedCount;
        }
        // ✅ For selected date (if today or future): Include progress only if fully completed
        else if (isCurrentDate && completedCount >= requiredTimes) {
            rotationOffset += requiredTimes;
        }
    }

    return rotationOffset % assignedUsers.length;
}








function mixedTurnData(task, selectedDate) {
    try {
        if (!task || typeof task !== "object" || !Array.isArray(task.users) || !task.date) {
            console.error("Invalid task input in mixedTurnData:", task);
            return { turns: [], completedCount: 0, requiredTimes: 1 };
        }

        const repeat = task.repeat || "Daily";
        const requiredTimes = repeat === "Daily" ? (Number.isInteger(task.timesPerDay) ? task.timesPerDay : 1)
                          : repeat === "Weekly" ? (Number.isInteger(task.timesPerWeek) ? task.timesPerWeek : 1)
                          : repeat === "Monthly" ? (Number.isInteger(task.timesPerMonth) ? task.timesPerMonth : 1)
                          : 1;

        const completions = Array.isArray(task.completions?.[selectedDate]) ? task.completions[selectedDate] : [];
        const pendingCompletions = Array.isArray(task.pendingCompletions?.[selectedDate]) ? task.pendingCompletions[selectedDate] : [];
        const tempTurnReplacement = typeof task.tempTurnReplacement?.[selectedDate] === "object" ? task.tempTurnReplacement[selectedDate] : {};

        const turns = [];
        const userCompletionCounts = {};
        const userPendingCounts = {};

        completions.forEach(user => {
            userCompletionCounts[user] = (userCompletionCounts[user] || 0) + 1;
        });

        pendingCompletions.forEach(user => {
            userPendingCounts[user] = (userPendingCounts[user] || 0) + 1;
        });

        const userOrder = [...task.users];
        const assignedUsers = [...userOrder];

        // Apply temp replacements
        Object.entries(tempTurnReplacement).forEach(([index, user]) => {
            const i = parseInt(index);
            if (!isNaN(i) && i >= 0 && i < assignedUsers.length) {
                assignedUsers[i] = user;
            }
        });

        // ✅ Updated offset calculation
        const rotationOffset = mixedTurnOffset(task, selectedDate);

        for (let i = 0; i < requiredTimes; i++) {
            const userIndex = (i + rotationOffset) % assignedUsers.length;
            const user = assignedUsers[userIndex];
            const originalUser = userOrder[userIndex];

            let isCompleted = false;
            let isPending = false;

            if (userCompletionCounts[user]) {
                isCompleted = true;
                userCompletionCounts[user]--;
            } else if (userPendingCounts[user]) {
                isPending = true;
                userPendingCounts[user]--;
            }

            turns.push({
                user,
                repetition: i + 1,
                isCompleted,
                isPending,
                originalUser,
                index: i
            });
        }

        const completedCount = completions.length + pendingCompletions.length;

        return { turns, completedCount, requiredTimes };
    } catch (err) {
        console.error("Error in mixedTurnData:", err);
        return { turns: [], completedCount: 0, requiredTimes: 1 };
    }
}







// addtasks.html settings: Rotation ///////////////////////////////////////////////////////////////////////


// addtasks.html settings: Individual ///////////////////////////////////////////////////////////////////////




function individualTurnData(task, selectedDate) {
    const repeat = task.repeat || "Daily";
    let requiredTimes = task.repeat === "Daily" ? task.timesPerDay || 1 :
                       task.repeat === "Weekly" ? task.timesPerWeek || 1 :
                       task.repeat === "Monthly" ? task.timesPerMonth || 1 : 1;

    const completions = (task.completions && task.completions[selectedDate]) || [];
    const pendingCompletions = (task.pendingCompletions && task.pendingCompletions[selectedDate]) || [];

    const turns = [];
    const userCompletionCounts = {};
    const userPendingCounts = {};

    completions.forEach(u => {
        userCompletionCounts[u] = (userCompletionCounts[u] || 0) + 1;
    });

    pendingCompletions.forEach(u => {
        userPendingCounts[u] = (userPendingCounts[u] || 0) + 1;
    });

    const userOrder = task.users && Array.isArray(task.users) ? [...task.users] : [];

    for (const user of userOrder) {
        for (let rep = 1; rep <= requiredTimes; rep++) {
            let isCompleted = false;
            let isPending = false;

            if (userCompletionCounts[user] && userCompletionCounts[user] > 0) {
                isCompleted = true;
                userCompletionCounts[user]--;
            } else if (userPendingCounts[user] && userPendingCounts[user] > 0) {
                isPending = true;
                userPendingCounts[user]--;
            }

            turns.push({
                user,
                repetition: rep,
                isCompleted,
                isPending,
                index: (userOrder.indexOf(user) * requiredTimes) + (rep - 1)
            });
        }
    }

    console.log("individualTurnData turns:", turns);
    return { turns, completedCount: completions.length + pendingCompletions.length, requiredTimes };
}



// addtasks.html settings: Individual ///////////////////////////////////////////////////////////////////////




function calculateIndividualProgress(task, selectedDate, user) {
    const completions = Array.isArray(task.completions?.[selectedDate]) ? task.completions[selectedDate] : [];
    const count = completions.filter(u => u === user).length;
    const required = task.repeat === "Daily" ? task.timesPerDay || 1 :
                    task.repeat === "Weekly" ? task.timesPerWeek || 1 :
                    task.repeat === "Monthly" ? task.timesPerMonth || 1 : 1;
    return {
        count,
        required,
        isComplete: count >= required
    };
}