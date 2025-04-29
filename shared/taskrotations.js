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




function prepareTaskTurnData(task, selectedDate) {
    const repeat = task.repeat || "Daily";
    let requiredTimes = task.timesPerDay || 1;
    if (repeat === "Weekly") requiredTimes = task.timesPerWeek || 1;
    if (repeat === "Monthly") requiredTimes = task.timesPerMonth || 1;

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

    let userOrder = task.users || [];
    const isRotation = (task.settings || "Rotation") === "Rotation";

    if (isRotation) {
        // 🛠 SHIFT user order based on today
        const rotation = calculateTurn(task, selectedDate);
        const startIndex = userOrder.indexOf(rotation.currentTurn);
        if (startIndex !== -1) {
            userOrder = [...userOrder.slice(startIndex), ...userOrder.slice(0, startIndex)];
        }
        
        for (let i = 0; i < requiredTimes; i++) {
            const originalUser = userOrder[i % userOrder.length];
            const user = tempTurnReplacement[i] || originalUser;
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
                originalUser
            });
        }
    } else {
        for (const user of userOrder) {
            for (let rep = 1; rep <= requiredTimes; rep++) {
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
                    repetition: rep,
                    isCompleted,
                    isPending
                });
            }
        }
    }

    return turns;
}
