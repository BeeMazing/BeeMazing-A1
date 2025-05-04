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

    const selected = parseLocalDate(selectedDate);
    const selectedDateStr = selected.toISOString().split("T")[0];
    const selectedYear = selected.getFullYear();
    const selectedMonth = selected.getMonth();

    return tasks.filter(task => {
        if (!task.date) return false;

        // Parse From-To range
        const range = task.date.split(" to ");
        const from = parseLocalDate(range[0]);
        const to = range[1] ? parseLocalDate(range[1]) : new Date(3000, 0, 1);
        const inRange = selected >= from && selected <= to;

        // ✅ Skip Monthly tasks after full completion in current month
        const isMonthly = task.repeat === "Monthly";
        const required = task.timesPerMonth || 1;

        if (isMonthly && required > 0 && (task.settings?.includes("Rotation") || task.settings?.includes("Individual"))) {
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
                totalCompletions >= required &&
                lastCompletionDate && selected > lastCompletionDate &&
                selected.getFullYear() === selectedYear &&
                selected.getMonth() === selectedMonth
            ) {
                return false; // ✅ Hide after final completion day in same month
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
    });
}


// addtasks.html settings: Rotation Daily ////////////////////////////////////////////////////////////////////////


function mixedTurnOffset(task, selectedDate) {
    const repeat = task.repeat || "Daily";
    const requiredTimes = repeat === "Monthly" ? (Number.isInteger(task.timesPerMonth) ? task.timesPerMonth : 1)
                      : repeat === "Weekly" ? (Number.isInteger(task.timesPerWeek) ? task.timesPerWeek : 1)
                      : repeat === "Daily" ? (Number.isInteger(task.timesPerDay) ? task.timesPerDay : 1)
                      : 1;

    const range = task.date.split(" to ");
    const taskStartDate = parseLocalDate(range[0]);
    const selected = parseLocalDate(selectedDate);
    const assignedUsers = task.users || [];
    if (assignedUsers.length === 0) return 0;

    if (repeat === "Monthly") {
        // ✅ Count completed sets in months BEFORE selected month
        let totalCompletionsBeforeMonth = 0;

        const selectedYear = selected.getFullYear();
        const selectedMonth = selected.getMonth();

        const addPriorMonthCompletions = (source) => {
            if (!source) return;
            for (const dateStr in source) {
                const d = parseLocalDate(dateStr);
                const y = d.getFullYear();
                const m = d.getMonth();

                // Only count completions from months before selected month
                if (y < selectedYear || (y === selectedYear && m < selectedMonth)) {
                    const arr = Array.isArray(source[dateStr]) ? source[dateStr] : [];
                    totalCompletionsBeforeMonth += arr.length;
                }
            }
        };

        addPriorMonthCompletions(task.completions);
        addPriorMonthCompletions(task.pendingCompletions);

        const fullRotations = Math.floor(totalCompletionsBeforeMonth / requiredTimes);
        return fullRotations % assignedUsers.length;
    }

    // ✅ Fallback to daily/weekly logic
    let rotationOffset = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
        if (!isFutureDate) {
            const completionsOnDay = Array.isArray(task.completions?.[dateStr]) ? task.completions[dateStr] : [];
            const pendingOnDay = Array.isArray(task.pendingCompletions?.[dateStr]) ? task.pendingCompletions[dateStr] : [];
            completedCount = completionsOnDay.length + pendingOnDay.length;
        }

        if (isFutureDate && !isCurrentDate) {
            rotationOffset += requiredTimes;
        } else if (!isCurrentDate || (isToday && completedCount >= requiredTimes)) {
            rotationOffset += completedCount >= requiredTimes ? requiredTimes : completedCount;
        } else if (isCurrentDate && completedCount >= requiredTimes) {
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
        const requiredTimes = repeat === "Monthly"
            ? (Number.isInteger(task.timesPerMonth) ? task.timesPerMonth : 1)
            : repeat === "Weekly"
            ? (Number.isInteger(task.timesPerWeek) ? task.timesPerWeek : 1)
            : repeat === "Daily"
            ? (Number.isInteger(task.timesPerDay) ? task.timesPerDay : 1)
            : 1;

        const selected = parseLocalDate(selectedDate);
        const selectedYear = selected.getFullYear();
        const selectedMonth = selected.getMonth();

        // ✅ For Monthly tasks, count completions for the whole month
        let completions = [];
        let pendingCompletions = [];

        if (repeat === "Monthly") {
            const gather = (source) => {
                const list = [];
                for (const dateStr in source || {}) {
                    const d = parseLocalDate(dateStr);
                    if (d.getFullYear() === selectedYear && d.getMonth() === selectedMonth) {
                        list.push(...(Array.isArray(source[dateStr]) ? source[dateStr] : []));
                    }
                }
                return list;
            };
            completions = gather(task.completions);
            pendingCompletions = gather(task.pendingCompletions);
        } else {
            completions = Array.isArray(task.completions?.[selectedDate]) ? task.completions[selectedDate] : [];
            pendingCompletions = Array.isArray(task.pendingCompletions?.[selectedDate]) ? task.pendingCompletions[selectedDate] : [];
        }

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

        Object.entries(tempTurnReplacement).forEach(([index, user]) => {
            const i = parseInt(index);
            if (!isNaN(i) && i >= 0 && i < assignedUsers.length) {
                assignedUsers[i] = user;
            }
        });

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
    const requiredTimes = repeat === "Monthly" ? (task.timesPerMonth || 1)
                      : repeat === "Weekly" ? (task.timesPerWeek || 1)
                      : repeat === "Daily" ? (task.timesPerDay || 1)
                      : 1;

    const selected = parseLocalDate(selectedDate);
    const selectedYear = selected.getFullYear();
    const selectedMonth = selected.getMonth();

    const completions = [];
    const pendingCompletions = [];

    if (repeat === "Monthly") {
        const gather = (source) => {
            const list = [];
            for (const dateStr in source || {}) {
                const d = parseLocalDate(dateStr);
                if (d.getFullYear() === selectedYear && d.getMonth() === selectedMonth) {
                    list.push(...(Array.isArray(source[dateStr]) ? source[dateStr] : []));
                }
            }
            return list;
        };
        completions.push(...gather(task.completions));
        pendingCompletions.push(...gather(task.pendingCompletions));
    } else {
        completions.push(...(Array.isArray(task.completions?.[selectedDate]) ? task.completions[selectedDate] : []));
        pendingCompletions.push(...(Array.isArray(task.pendingCompletions?.[selectedDate]) ? task.pendingCompletions[selectedDate] : []));
    }

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

    return {
        turns,
        completedCount: completions.length + pendingCompletions.length,
        requiredTimes
    };
}




// addtasks.html settings: Individual ///////////////////////////////////////////////////////////////////////





function calculateIndividualProgress(task, selectedDate, user) {
    const repeat = task.repeat || "Daily";
    const required = repeat === "Daily" ? task.timesPerDay || 1 :
                    repeat === "Weekly" ? task.timesPerWeek || 1 :
                    repeat === "Monthly" ? task.timesPerMonth || 1 : 1;

    let count = 0;

    if (repeat === "Monthly") {
        const selected = parseLocalDate(selectedDate);
        const year = selected.getFullYear();
        const month = selected.getMonth();

        for (const dateStr in task.completions || {}) {
            const d = parseLocalDate(dateStr);
            if (d.getFullYear() === year && d.getMonth() === month) {
                const dayCompletions = task.completions[dateStr];
                if (Array.isArray(dayCompletions)) {
                    count += dayCompletions.filter(u => u === user).length;
                }
            }
        }

        for (const dateStr in task.pendingCompletions || {}) {
            const d = parseLocalDate(dateStr);
            if (d.getFullYear() === year && d.getMonth() === month) {
                const dayPendings = task.pendingCompletions[dateStr];
                if (Array.isArray(dayPendings)) {
                    count += dayPendings.filter(u => u === user).length;
                }
            }
        }
    } else {
        const completions = Array.isArray(task.completions?.[selectedDate]) ? task.completions[selectedDate] : [];
        const pendingCompletions = Array.isArray(task.pendingCompletions?.[selectedDate]) ? task.pendingCompletions[selectedDate] : [];
        count = completions.filter(u => u === user).length + pendingCompletions.filter(u => u === user).length;
    }

    return {
        count,
        required,
        isComplete: count >= required
    };
}


