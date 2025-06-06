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






// addtasks.html settings: Rotation Daily ////////////////////////////////////////////////////////////////////////


function mixedTurnOffset(task, selectedDate) {
    const repeat = task.repeat || "Daily";
    const requiredTimes = repeat === "Monthly" ? (Number.isInteger(task.timesPerMonth) ? task.timesPerMonth : 1)
        : repeat === "Weekly" ? (Number.isInteger(task.timesPerWeek) ? task.timesPerWeek : 1)
        : repeat === "Daily" ? (Number.isInteger(task.timesPerDay) ? task.timesPerDay : 1)
        : 1;

    const assignedUsers = task.users || [];
    if (assignedUsers.length === 0) return 0;

    const selected = parseLocalDate(selectedDate);
    const selectedYear = selected.getFullYear();
    const selectedMonth = selected.getMonth();

    if (repeat === "Monthly") {
        const allCompletions = [];
        const gatherCompletions = (source) => {
            if (!source) return;
            for (const dateStr in source) {
                const d = parseLocalDate(dateStr);
                if (d.getFullYear() <= selectedYear && d.getMonth() <= selectedMonth) {
                    const completions = Array.isArray(source[dateStr]) ? source[dateStr] : [];
                    completions.forEach(user => {
                        allCompletions.push({ date: d, user });
                    });
                }
            }
        };

        gatherCompletions(task.completions);
        gatherCompletions(task.pendingCompletions);
        allCompletions.sort((a, b) => a.date - b.date);

        let completionCount = 0;
        for (const completion of allCompletions) {
            if (
                completion.date.getFullYear() < selectedYear ||
                (completion.date.getFullYear() === selectedYear && completion.date.getMonth() < selectedMonth)
            ) {
                completionCount++;
            } else if (
                completion.date.getFullYear() === selectedYear &&
                completion.date.getMonth() === selectedMonth &&
                completion.date <= selected
            ) {
                completionCount++;
            }
        }

        return completionCount % assignedUsers.length;
    }

    if (repeat === "Weekly") {
        const allCompletions = [];
        const gatherCompletions = (source) => {
            if (!source) return;
            for (const dateStr in source) {
                const d = parseLocalDate(dateStr);
                const completions = Array.isArray(source[dateStr]) ? source[dateStr] : [];
                completions.forEach(user => {
                    allCompletions.push({ date: d, user });
                });
            }
        };

        gatherCompletions(task.completions);
        gatherCompletions(task.pendingCompletions);
        allCompletions.sort((a, b) => a.date - b.date);

        let completionCount = 0;
        const selectedWeekStart = new Date(selected);
        selectedWeekStart.setHours(0, 0, 0, 0);
        const selectedDayOfWeek = selectedWeekStart.getDay();
        const daysToMonday = selectedDayOfWeek === 0 ? 6 : selectedDayOfWeek - 1;
        selectedWeekStart.setDate(selectedWeekStart.getDate() - daysToMonday);

        for (const completion of allCompletions) {
            const completionWeekStart = new Date(completion.date);
            completionWeekStart.setHours(0, 0, 0, 0);
            const completionDayOfWeek = completionWeekStart.getDay();
            const completionDaysToMonday = completionDayOfWeek === 0 ? 6 : completionDayOfWeek - 1;
            completionWeekStart.setDate(completionWeekStart.getDate() - completionDaysToMonday);

            if (
                completionWeekStart < selectedWeekStart ||
                (
                    completionWeekStart.getTime() === selectedWeekStart.getTime() &&
                    completion.date <= selected
                )
            ) {
                completionCount++;
            }
        }

        return completionCount % assignedUsers.length;
    }

    // Daily tasks with timesPerDay = 1: Check for missed turns
    if (repeat === "Daily" && requiredTimes === 1) {
        const range = task.date.split(" to ");
        const taskStartDate = parseLocalDate(range[0]);
        const userList = task.users || [];
        const tempTurnReplacement = task.tempTurnReplacement?.[selectedDate] || {};
        const assignedUsers = [...new Set([...userList, ...Object.values(tempTurnReplacement)])];

        let rotationOffset = 0;
        let currentDate = new Date(taskStartDate);
        currentDate.setHours(0, 0, 0, 0);

        while (currentDate <= selected) {
            const dateStr = currentDate.toISOString().split("T")[0];
            const isCurrentDate = dateStr === selectedDate;

            const dayAssignedUsers = [...new Set([...userList, ...(task.tempTurnReplacement?.[dateStr] || {})])];
            const dayIndex = rotationOffset % dayAssignedUsers.length;
            const expectedUser = dayAssignedUsers[dayIndex];

            const completionsOnDay = Array.isArray(task.completions?.[dateStr]) ? task.completions[dateStr] : [];
            const pendingOnDay = Array.isArray(task.pendingCompletions?.[dateStr]) ? task.pendingCompletions[dateStr] : [];
            const completed = completionsOnDay.some(c => c.user === expectedUser) || pendingOnDay.some(p => p.user === expectedUser);

            if (completed || isCurrentDate) {
                rotationOffset++;
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return (rotationOffset - 1) % assignedUsers.length;
    }

    // Other daily tasks
    const range = task.date.split(" to ");
    const taskStartDate = parseLocalDate(range[0]);
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

        completions.forEach(c => {
            userCompletionCounts[c.user] = (userCompletionCounts[c.user] || 0) + 1;
        });

        pendingCompletions.forEach(p => {
            userPendingCounts[p.user] = (userPendingCounts[p.user] || 0) + 1;
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
        const currentTurnIndex = task.currentTurnIndex ?? rotationOffset;

        for (let i = 0; i < requiredTimes; i++) {
            const userIndex = (i + currentTurnIndex) % assignedUsers.length;
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
    try {
        if (!task || typeof task !== "object" || !Array.isArray(task.users) || !task.date) {
            console.error("Invalid task input in individualTurnData:", task);
            return { turns: [], completedCount: 0, requiredTimes: 1 };
        }

        const repeat = task.repeat || "Daily";
        const requiredTimes = repeat === "Monthly" ? (task.timesPerMonth || 1)
                          : repeat === "Weekly" ? (task.timesPerWeek || 1)
                          : repeat === "Daily" ? (task.timesPerDay || 1)
                          : 1;

        const selected = parseLocalDate(selectedDate);
        const selectedYear = selected.getFullYear();
        const selectedMonth = selected.getMonth();

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

        const turns = [];
        const userOrder = task.users && Array.isArray(task.users) ? [...task.users] : [];

        let globalIndex = 0;
        for (const user of userOrder) {
            const userCompletions = completions.filter(c => c.user === user);
            const userPendings = pendingCompletions.filter(p => p.user === user);

            for (let rep = 1; rep <= requiredTimes; rep++) {
                const isCompleted = userCompletions.some(c => c.repetition === rep);
                const isPending = !isCompleted && userPendings.some(p => p.repetition === rep);

                turns.push({
                    user,
                    repetition: rep,
                    isCompleted,
                    isPending,
                    index: globalIndex++
                });
            }
        }

        // completedCount is global, but only for admin/debug views
        const completedCount = completions.length + pendingCompletions.length;

        return {
            turns,
            completedCount,
            requiredTimes // Per-user requirement
        };
    } catch (err) {
        console.error("Error in individualTurnData:", err);
        return { turns: [], completedCount: 0, requiredTimes: 1 };
    }
}















// addtasks.html settings: Individual ///////////////////////////////////////////////////////////////////////




function calculateIndividualProgress(task, selectedDate, user) {
    const repeat = task.repeat || "Daily";
    const required = repeat === "Daily" ? (task.timesPerDay || 1) :
                    repeat === "Weekly" ? (task.timesPerWeek || 1) :
                    repeat === "Monthly" ? (task.timesPerMonth || 1) : 1;

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
                    count += dayCompletions.filter(c => c.user === user).length;
                }
            }
        }

        for (const dateStr in task.pendingCompletions || {}) {
            const d = parseLocalDate(dateStr);
            if (d.getFullYear() === year && d.getMonth() === month) {
                const dayPendings = task.pendingCompletions[dateStr];
                if (Array.isArray(dayPendings)) {
                    count += dayPendings.filter(p => p.user === user).length;
                }
            }
        }
    } else {
        const completions = Array.isArray(task.completions?.[selectedDate]) ? task.completions[selectedDate] : [];
        const pendingCompletions = Array.isArray(task.pendingCompletions?.[selectedDate]) ? task.pendingCompletions[selectedDate] : [];
        count = completions.filter(c => c.user === user).length + pendingCompletions.filter(p => p.user === user).length;
    }

    return {
        count,
        required,
        isComplete: count >= required
    };
}







async function updateUserReward(userName, amount) {
    const adminEmail = localStorage.getItem("currentAdminEmail");
    try {
      const response = await fetch("https://beemazing1.onrender.com/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminEmail, user: userName, amount })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update rewards");
    } catch (err) {
      console.error("Error updating user reward:", err);
      throw err;
    }
  }
  
  async function saveTaskHistory(userName, task) {
    const adminEmail = localStorage.getItem("currentAdminEmail");
    const now = new Date();
    const month = now.toLocaleString("default", { month: "long" });
    const date = now.getDate();
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const dateString = now.toLocaleDateString();
  
    try {
      const response = await fetch(`https://beemazing1.onrender.com/api/history?adminEmail=${encodeURIComponent(adminEmail)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch history");
      const history = data.history || {};
  
      if (!history[month]) history[month] = {};
      if (!history[month][date]) history[month][date] = [];
      history[month][date].push({
        title: task.title,
        user: userName,
        timestamp: `${dateString} at ${time}`,
      });
  
      await fetch("https://beemazing1.onrender.com/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminEmail, history })
      });
    } catch (err) {
      console.error("Error saving task history:", err);
    }
  }
  
  async function updateLuckyChestProgress(userName, earnedHoney) {
    const adminEmail = localStorage.getItem("currentAdminEmail");
    try {
      const response = await fetch(`https://beemazing1.onrender.com/api/lucky-chests?adminEmail=${encodeURIComponent(adminEmail)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch lucky chests");
      const allChests = data.luckyChests || {};
      const userChests = allChests[userName] || [];
  
      let updated = false;
      userChests.forEach(chest => {
        if (chest.progress < chest.requiredPoints) {
          chest.progress += earnedHoney;
          if (chest.progress > chest.requiredPoints) {
            chest.progress = chest.requiredPoints;
          }
          updated = true;
        }
      });
  
      if (updated) {
        allChests[userName] = userChests;
        await fetch("https://beemazing1.onrender.com/api/lucky-chests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adminEmail, luckyChests: allChests })
        });
      }
    } catch (err) {
      console.error("Error updating lucky chest progress:", err);
    }
  }
  
  // Export for use in HTML
  window.updateUserReward = updateUserReward;
  window.saveTaskHistory = saveTaskHistory;
  window.updateLuckyChestProgress = updateLuckyChestProgress;