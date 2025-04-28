// /BeeMazing-Y1/shared/taskrotations.js

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
