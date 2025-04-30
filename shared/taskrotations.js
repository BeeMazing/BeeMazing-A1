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

// Existing functions (unchanged)
function calculateTurn(task, selectedDate) {
    const userOrder = task.users && Array.isArray(task.users) ? [...task.users] : [];
    const repeatLimit = task.repeat === "Daily" ? task.timesPerDay || 1 :
                       task.repeat === "Weekly" ? task.timesPerWeek || 1 :
                       task.repeat === "Monthly" ? task.timesPerMonth || 1 : 1;
    const tempTurnReplacement = task.tempTurnReplacement?.[selectedDate] || {};
    const assignedUsers = [...userOrder];
    Object.entries(tempTurnReplacement).forEach(([index, user]) => {
        assignedUsers[parseInt(index)] = user;
    });

    const completedUsers = Array.isArray(task.completions?.[selectedDate]) ? task.completions[selectedDate] : [];
    const pendingUsers = Array.isArray(task.pendingCompletions?.[selectedDate]) ? task.pendingCompletions[selectedDate] : [];
    const completedCount = completedUsers.length + pendingUsers.length;

    const selected = parseLocalDate(selectedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = parseLocalDate(task.date.split(" to ")[0]);

    let currentTurn = null;
    let nextUser = null;

    if (completedCount >= repeatLimit) {
        currentTurn = "All done!";
        nextUser = "—";
    } else {
        let lastCompletionDate = startDate;
        let lastCompletedCount = 0;
        if (task.completions) {
            const completionDates = Object.keys(task.completions)
                .map(date => parseLocalDate(date))
                .filter(date => date < today)
                .sort((a, b) => b - a);
            if (completionDates.length > 0) {
                lastCompletionDate = completionDates[0];
                const lastDateStr = lastCompletionDate.toISOString().split("T")[0];
                const lastCompletions = task.completions[lastDateStr] || [];
                const lastPending = task.pendingCompletions?.[lastDateStr] || [];
                lastCompletedCount = lastCompletions.length + lastPending.length;
            }
        }

        if (selected < today) {
            const currentIndex = completedCount % assignedUsers.length;
            currentTurn = assignedUsers[currentIndex];
            const nextIndex = (completedCount + 1) % assignedUsers.length;
            nextUser = assignedUsers[nextIndex];
        } else if (selected.getTime() === today.getTime()) {
            const totalCompletions = lastCompletedCount + completedCount;
            const currentIndex = totalCompletions % assignedUsers.length;
            currentTurn = assignedUsers[currentIndex];
            const nextIndex = (totalCompletions + 1) % assignedUsers.length;
            nextUser = assignedUsers[nextIndex];
        } else {
            const daysDiff = Math.floor((selected - lastCompletionDate) / (1000 * 60 * 60 * 24));
            const totalCompletions = lastCompletedCount + (daysDiff - 1) * repeatLimit + completedCount;
            const currentIndex = totalCompletions % assignedUsers.length;
            currentTurn = assignedUsers[currentIndex];
            const nextIndex = (totalCompletions + 1) % assignedUsers.length;
            nextUser = assignedUsers[nextIndex];
        }
    }

    return {
        currentTurn: currentTurn || "All done!",
        nextUser: nextUser || "—",
        completedCount,
        repeatLimit,
        userOrder: assignedUsers
    };
}

function prepareTaskTurnData(task, selectedDate) {
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
    const isRotation = (task.settings || "Rotation") === "Rotation";

    if (isRotation) {
        const assignedUsers = [...userOrder];
        Object.entries(tempTurnReplacement).forEach(([index, user]) => {
            if (parseInt(index) < assignedUsers.length) {
                assignedUsers[parseInt(index)] = user;
            }
        });

        const completedCount = completions.length + pendingCompletions.length;
        const selected = parseLocalDate(selectedDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDate = parseLocalDate(task.date.split(" to ")[0]);

        let lastCompletionDate = startDate;
        let lastCompletedCount = 0;
        if (task.completions) {
            const completionDates = Object.keys(task.completions)
                .map(date => parseLocalDate(date))
                .filter(date => date < today)
                .sort((a, b) => b - a);
            if (completionDates.length > 0) {
                lastCompletionDate = completionDates[0];
                const lastDateStr = lastCompletionDate.toISOString().split("T")[0];
                const lastCompletions = task.completions[lastDateStr] || [];
                const lastPending = task.pendingCompletions?.[lastDateStr] || [];
                lastCompletedCount = lastCompletions.length + lastPending.length;
            }
        }

        let totalCompletions;
        if (selected < today) {
            totalCompletions = completedCount;
        } else if (selected.getTime() === today.getTime()) {
            totalCompletions = lastCompletedCount + completedCount;
        } else {
            const daysDiff = Math.floor((selected - lastCompletionDate) / (1000 * 60 * 60 * 24));
            totalCompletions = lastCompletedCount + (daysDiff - 1) * requiredTimes + completedCount;
        }

        console.log("prepareTaskTurnData debug:", {
            selectedDate,
            startDate: startDate.toISOString(),
            lastCompletionDate: lastCompletionDate.toISOString(),
            daysDiff: selected < today ? "N/A (past)" : Math.floor((selected - lastCompletionDate) / (1000 * 60 * 60 * 24)),
            totalCompletions,
            assignedUsers,
            completedCount,
            completions,
            pendingCompletions,
            tempTurnReplacement
        });

        for (let i = 0; i < requiredTimes; i++) {
            const userIndex = (totalCompletions + i) % (assignedUsers.length || 1);
            const user = assignedUsers[userIndex] || "Unknown";
            const originalUser = userOrder[userIndex] || user;
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
                repetition: i + 1,
                isCompleted,
                isPending,
                originalUser
            });
        }
    } else {
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
                    isPending
                });
            }
        }
    }

    console.log("prepareTaskTurnData turns:", turns);
    return turns;
}

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