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


function mixedTurnData(task, selectedDate) {
    const repeat = task.repeat || "Daily";
    let requiredTimes = task.repeat === "Daily" ? task.timesPerDay || 1 :
                       task.repeat === "Weekly" ? task.timesPerWeek || 1 :
                       task.repeat === "Monthly" ? task.timesPerMonth || 1 : 1;

    const completions = (task.completions && task.completions[selectedDate]) || [];
    const pendingCompletions = (task.pendingCompletions && task.pendingCompletions[selectedDate]) || [];
    const tempTurnReplacement = (task.tempTurnReplacement && task.tempTurnReplacement[selectedDate]) || {};

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
    const assignedUsers = [...userOrder];
    Object.entries(tempTurnReplacement).forEach(([index, user]) => {
        if (parseInt(index) < assignedUsers.length) {
            assignedUsers[parseInt(index)] = user;
        }
    });

    // Calculate completed and pending turns for progress
    const completedCount = completions.length + pendingCompletions.length;

    // Calculate rotation offset for Daily tasks
    let rotationOffset = 0;
    if (repeat === "Daily" && assignedUsers.length > 0) {
        // Parse task start date and selected date
        const range = task.date.split(" to ");
        const taskStartDate = parseLocalDate(range[0]);
        const selected = parseLocalDate(selectedDate);

        // Sum turns for all previous days
        let totalPreviousTurns = 0;
        const start = new Date(taskStartDate);
        const end = new Date(selected);
        end.setDate(end.getDate() - 1); // Up to the day before selectedDate

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split("T")[0];
            // Use actual completions if available, otherwise assume requiredTimes
            const dayCompletions = (task.completions && task.completions[dateStr]) || [];
            const dayPending = (task.pendingCompletions && task.pendingCompletions[dateStr]) || [];
            const dayTurns = dayCompletions.length + dayPending.length;
            totalPreviousTurns += (dayTurns > 0 ? dayTurns : requiredTimes);
        }

        // Calculate offset: total turns modulo number of users
        rotationOffset = totalPreviousTurns % assignedUsers.length;
    }

    // Generate turns for the required number of times
    for (let i = 0; i < requiredTimes; i++) {
        const userIndex = (i + rotationOffset) % (assignedUsers.length || 1);
        const user = assignedUsers[userIndex] || "Unknown";
        const originalUser = userOrder[userIndex] || user;
        let isCompleted = false;
        let isPending = false;

        // Check if this turn is completed or pending
        if (userCompletionCounts[user] && userCompletionCounts[user] > 0) {
            isCompleted = true;
            userCompletionCounts[user]--;
        } else if (userPendingCounts[user] && userPendingCounts[user] > 0) {
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

    console.log("mixedTurnData debug:", {
        selectedDate,
        assignedUsers,
        completedCount,
        requiredTimes,
        completions,
        pendingCompletions,
        tempTurnReplacement,
        rotationOffset,
        totalPreviousTurns,
        turns
    });

    return { turns, completedCount, requiredTimes };
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