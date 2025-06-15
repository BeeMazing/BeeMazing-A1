// Parse a date string (e.g., "2025-04-30") into a Date object
function parseLocalDate(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return new Date(3000, 0, 1);
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

  return tasks
    .filter((task) => {
      // Handle "as needed" tasks - always show them regardless of date
      if (task.asNeeded || task.repeat === "As Needed" || !task.date) {
        return true;
      }

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
      if (
        task.repeat === "Monthly" &&
        task.monthlySchedulingType === "daysOfMonth" &&
        task.monthlyDaysOfMonth
      ) {
        const selectedDayOfMonth = selected.getDate();
        const allowedDays = task.monthlyDaysOfMonth
          .split(",")
          .map((day) => parseInt(day.trim()));

        // Only show if today's day of month matches one of the allowed days
        if (!allowedDays.includes(selectedDayOfMonth)) {
          return false;
        }
      }

      // Filter monthly tasks by specific days of week (e.g., 2nd Tuesday, last Friday)
      if (
        task.repeat === "Monthly" &&
        task.monthlySchedulingType === "daysOfWeek" &&
        task.monthlyDaysOfWeek
      ) {
        const selectedDayOfWeek = selected.getDay(); // 0=Sunday, 1=Monday, etc.
        const selectedDate = selected.getDate();
        const selectedMonth = selected.getMonth();
        const selectedYear = selected.getFullYear();

        // Parse the monthlyDaysOfWeek format: "1:1,3:5" (1st Monday, 3rd Friday) or "2:Wednesday"
        const weekdayMap = {
          Sunday: 0,
          Monday: 1,
          Tuesday: 2,
          Wednesday: 3,
          Thursday: 4,
          Friday: 5,
          Saturday: 6,
        };

        const allowedWeekDays = task.monthlyDaysOfWeek
          .split(",")
          .map((dayData) => {
            const [occurrence, weekdayStr] = dayData
              .split(":")
              .map((x) => x.trim());
            const weekday = isNaN(weekdayStr)
              ? weekdayMap[weekdayStr]
              : parseInt(weekdayStr);
            return { occurrence: parseInt(occurrence), weekday };
          });

        let matchesWeekdaySchedule = false;

        for (const { occurrence, weekday } of allowedWeekDays) {
          if (selectedDayOfWeek === weekday) {
            // Calculate which occurrence of this weekday this is in the month
            const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);
            const firstOccurrenceOfWeekday =
              ((weekday - firstDayOfMonth.getDay() + 7) % 7) + 1;
            const weekOccurrence =
              Math.floor((selectedDate - firstOccurrenceOfWeekday) / 7) + 1;

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

      if (
        isMonthly &&
        monthlyRequired > 0 &&
        (task.settings?.includes("Rotation") ||
          task.settings?.includes("Individual"))
      ) {
        let totalCompletions = 0;
        let lastCompletionDate = null;

        const countAndTrackLastDate = (source) => {
          if (!source || typeof source !== "object") return;
          for (const dateStr in source) {
            const d = parseLocalDate(dateStr);
            if (
              d.getFullYear() === selectedYear &&
              d.getMonth() === selectedMonth
            ) {
              const entries = Array.isArray(source[dateStr])
                ? source[dateStr].length
                : 0;
              totalCompletions += entries;
              if (
                entries > 0 &&
                (!lastCompletionDate || d > lastCompletionDate)
              ) {
                lastCompletionDate = d;
              }
            }
          }
        };

        countAndTrackLastDate(task.completions);
        countAndTrackLastDate(task.pendingCompletions);

        if (
          totalCompletions >= monthlyRequired &&
          lastCompletionDate &&
          selected > lastCompletionDate &&
          selected.getFullYear() === selectedYear &&
          selected.getMonth() === selectedMonth
        ) {
          return false; // Hide after final completion day in same month
        }
      }

      // Skip Weekly tasks after full completion in current week
      const isWeekly = task.repeat === "Weekly";
      const weeklyRequired = task.timesPerWeek || 1;

      if (
        isWeekly &&
        weeklyRequired > 0 &&
        (task.settings?.includes("Rotation") ||
          task.settings?.includes("Individual"))
      ) {
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
              const entries = Array.isArray(source[dateStr])
                ? source[dateStr].length
                : 0;
              totalCompletions += entries;
              if (
                entries > 0 &&
                (!lastCompletionDate || d > lastCompletionDate)
              ) {
                lastCompletionDate = d;
              }
            }
          }
        };

        countAndTrackLastDate(task.completions);
        countAndTrackLastDate(task.pendingCompletions);

        if (
          totalCompletions >= weeklyRequired &&
          lastCompletionDate &&
          selected > lastCompletionDate &&
          selected.getTime() >= selectedWeekStart.getTime()
        ) {
          return false; // Hide after final completion day in same week
        }
      }

      // Use Specific Dates first
      if (task.specificDates) {
        const specificDates = task.specificDates
          .split(",")
          .map((date) => date.trim());
        return specificDates.includes(selectedDateStr);
      }

      // Use Days of Week second
      if (task.daysOfWeek && !task.daysOfWeek.includes("Any")) {
        let days = task.daysOfWeek;
        if (typeof days === "string") {
          days = days
            .split(",")
            .map((d) => d.trim())
            .filter((d) => d);
        }
        if (Array.isArray(days) && days.length > 0) {
          const dayOfWeek = selected.toLocaleDateString(undefined, {
            weekday: "long",
          });
          return days.includes(dayOfWeek) && inRange;
        }
      }

      // Default: From-To
      return inRange;
    })
    .map((task) => {
      // Apply task modifications for specific dates if they exist
      if (task.exceptions && task.exceptions[selectedDateStr]) {
        const exception = task.exceptions[selectedDateStr];
        if (exception.modified && exception.task) {
          // Return the modified task for this specific date
          return {
            ...task,
            ...exception.task,
            originalTask: task, // Keep reference to original for tracking
            isModified: true,
          };
        }
      }
      return task;
    });
}

// addtasks.html settings: Rotation Daily ////////////////////////////////////////////////////////////////////////

function calculateGlobalOccurrenceNumber(
  task,
  selectedDate,
  occurrenceIndex = 0,
) {
  // Calculate global occurrence number for continuous rotation
  const repeat = task.repeat || "Daily";
  const requiredTimes =
    repeat === "Monthly"
      ? Number.isInteger(task.timesPerMonth)
        ? task.timesPerMonth
        : 1
      : repeat === "Weekly"
        ? Number.isInteger(task.timesPerWeek)
          ? task.timesPerWeek
          : 1
        : repeat === "Daily"
          ? Number.isInteger(task.timesPerDay)
            ? task.timesPerDay
            : 1
          : 1;

  const range = task.date.split(" to ");
  const taskStartDate = parseLocalDate(range[0]);
  const selected = parseLocalDate(selectedDate);

  let totalOccurrences = 0;

  // Count all occurrences from task start to selected date
  for (
    let currentDate = new Date(taskStartDate);
    currentDate < selected;
    currentDate.setDate(currentDate.getDate() + 1)
  ) {
    if (repeat === "Daily") {
      totalOccurrences += requiredTimes;
    } else if (repeat === "Weekly") {
      // Add weekly logic if needed
      totalOccurrences += requiredTimes;
    } else if (repeat === "Monthly") {
      // Add monthly logic if needed
      totalOccurrences += requiredTimes;
    }
  }

  // Add current occurrence index (0-based)
  totalOccurrences += occurrenceIndex + 1;

  return totalOccurrences;
}

function mixedTurnOffset(task, selectedDate) {
  const repeat = task.repeat || "Daily";
  const requiredTimes =
    repeat === "Monthly"
      ? Number.isInteger(task.timesPerMonth)
        ? task.timesPerMonth
        : 1
      : repeat === "Weekly"
        ? Number.isInteger(task.timesPerWeek)
          ? task.timesPerWeek
          : 1
        : repeat === "Daily"
          ? Number.isInteger(task.timesPerDay)
            ? task.timesPerDay
            : 1
          : 1;

  const assignedUsers = task.users || [];
  if (assignedUsers.length === 0) return 0;

  // Use global occurrence number for continuous rotation
  const globalOccurrenceNumber = calculateGlobalOccurrenceNumber(
    task,
    selectedDate,
    0,
  );
  return (globalOccurrenceNumber - 1) % assignedUsers.length;
}

function mixedTurnOffsetLegacy(task, selectedDate) {
  const repeat = task.repeat || "Daily";
  const requiredTimes =
    repeat === "Monthly"
      ? Number.isInteger(task.timesPerMonth)
        ? task.timesPerMonth
        : 1
      : repeat === "Weekly"
        ? Number.isInteger(task.timesPerWeek)
          ? task.timesPerWeek
          : 1
        : repeat === "Daily"
          ? Number.isInteger(task.timesPerDay)
            ? task.timesPerDay
            : 1
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
          const completions = Array.isArray(source[dateStr])
            ? source[dateStr]
            : [];
          completions.forEach((user) => {
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
        (completion.date.getFullYear() === selectedYear &&
          completion.date.getMonth() < selectedMonth)
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
        const completions = Array.isArray(source[dateStr])
          ? source[dateStr]
          : [];
        completions.forEach((user) => {
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
      const completionDaysToMonday =
        completionDayOfWeek === 0 ? 6 : completionDayOfWeek - 1;
      completionWeekStart.setDate(
        completionWeekStart.getDate() - completionDaysToMonday,
      );

      if (
        completionWeekStart < selectedWeekStart ||
        (completionWeekStart.getTime() === selectedWeekStart.getTime() &&
          completion.date <= selected)
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
    const assignedUsers = [
      ...new Set([...userList, ...Object.values(tempTurnReplacement)]),
    ];

    let rotationOffset = 0;
    let currentDate = new Date(taskStartDate);
    currentDate.setHours(0, 0, 0, 0);

    while (currentDate <= selected) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const isCurrentDate = dateStr === selectedDate;

      const dayAssignedUsers = [
        ...new Set([
          ...userList,
          ...(task.tempTurnReplacement?.[dateStr] || {}),
        ]),
      ];
      const dayIndex = rotationOffset % dayAssignedUsers.length;
      const expectedUser = dayAssignedUsers[dayIndex];

      const completionsOnDay = Array.isArray(task.completions?.[dateStr])
        ? task.completions[dateStr]
        : [];
      const pendingOnDay = Array.isArray(task.pendingCompletions?.[dateStr])
        ? task.pendingCompletions[dateStr]
        : [];
      const completed =
        completionsOnDay.some((c) => c.user === expectedUser) ||
        pendingOnDay.some((p) => p.user === expectedUser);

      if (completed || isCurrentDate) {
        rotationOffset++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return (rotationOffset - 1) % assignedUsers.length;
  }

  // Other daily tasks (including multiple daily occurrences)
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
      const completionsOnDay = Array.isArray(task.completions?.[dateStr])
        ? task.completions[dateStr]
        : [];
      const pendingOnDay = Array.isArray(task.pendingCompletions?.[dateStr])
        ? task.pendingCompletions[dateStr]
        : [];
      completedCount = completionsOnDay.length + pendingOnDay.length;
    }

    if (isFutureDate && !isCurrentDate) {
      rotationOffset += requiredTimes;
    } else if (!isCurrentDate || (isToday && completedCount >= requiredTimes)) {
      rotationOffset +=
        completedCount >= requiredTimes ? requiredTimes : completedCount;
    } else if (isCurrentDate && completedCount >= requiredTimes) {
      rotationOffset += requiredTimes;
    }
  }

  return rotationOffset % assignedUsers.length;
}

function fairRotationTurnData(task, selectedDate) {
  try {
    if (
      !task ||
      typeof task !== "object" ||
      !Array.isArray(task.users) ||
      !task.date
    ) {
      console.error("Invalid task input in fairRotationTurnData:", task);
      return { turns: [], completedCount: 0, requiredTimes: 1 };
    }

    const repeat = task.repeat || "Daily";
    let requiredTimes;
    if (repeat === "Monthly") {
      requiredTimes =
        Number.isInteger(task.timesPerMonth) && task.timesPerMonth > 0
          ? task.timesPerMonth
          : 1;
    } else if (repeat === "Weekly") {
      requiredTimes =
        Number.isInteger(task.timesPerWeek) && task.timesPerWeek > 0
          ? task.timesPerWeek
          : 1;
    } else if (repeat === "Daily") {
      requiredTimes =
        Number.isInteger(task.timesPerDay) && task.timesPerDay > 0
          ? task.timesPerDay
          : 1;
    } else {
      requiredTimes = 1;
    }

    // Get all completions for this task to calculate lifetime completion counts per user
    const allUserCompletions = {};
    const assignedUsers = [...task.users];

    // Initialize completion counts
    assignedUsers.forEach((user) => {
      allUserCompletions[user] = 0;
    });

    // Count all historical completions for each user
    if (task.completions) {
      Object.values(task.completions).forEach((dayCompletions) => {
        if (Array.isArray(dayCompletions)) {
          dayCompletions.forEach((completion) => {
            if (assignedUsers.includes(completion.user)) {
              allUserCompletions[completion.user]++;
            }
          });
        }
      });
    }

    // Count pending completions
    if (task.pendingCompletions) {
      Object.values(task.pendingCompletions).forEach((dayPending) => {
        if (Array.isArray(dayPending)) {
          dayPending.forEach((pending) => {
            if (assignedUsers.includes(pending.user)) {
              allUserCompletions[pending.user]++;
            }
          });
        }
      });
    }

    // Debug logging for fair rotation
    console.log(
      `Fair Rotation Debug for task "${task.title}" on ${selectedDate}:`,
    );
    console.log("Lifetime completion counts:", allUserCompletions);

    // Get completions for current date
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
          if (
            d.getFullYear() === selectedYear &&
            d.getMonth() === selectedMonth
          ) {
            list.push(
              ...(Array.isArray(source[dateStr]) ? source[dateStr] : []),
            );
          }
        }
        return list;
      };
      completions = gather(task.completions);
      pendingCompletions = gather(task.pendingCompletions);
    } else {
      completions = Array.isArray(task.completions?.[selectedDate])
        ? task.completions[selectedDate]
        : [];
      pendingCompletions = Array.isArray(
        task.pendingCompletions?.[selectedDate],
      )
        ? task.pendingCompletions[selectedDate]
        : [];
    }

    const userCompletionCounts = {};
    const userPendingCounts = {};

    // Handle merged completion data that includes isPending flag
    completions.forEach((c) => {
      if (c.isPending === true) {
        userPendingCounts[c.user] = (userPendingCounts[c.user] || 0) + 1;
      } else {
        userCompletionCounts[c.user] = (userCompletionCounts[c.user] || 0) + 1;
      }
    });

    // Legacy pending completions (if any still exist separately)
    pendingCompletions.forEach((p) => {
      userPendingCounts[p.user] = (userPendingCounts[p.user] || 0) + 1;
    });

    const turns = [];

    for (let i = 0; i < requiredTimes; i++) {
      // Find user with minimum completion count
      let nextUser = null;
      let minCompletions = Infinity;
      let candidatesWithMinCount = [];

      assignedUsers.forEach((user) => {
        const totalCompletions = allUserCompletions[user];
        if (totalCompletions < minCompletions) {
          minCompletions = totalCompletions;
          candidatesWithMinCount = [user];
        } else if (totalCompletions === minCompletions) {
          candidatesWithMinCount.push(user);
        }
      });

      // If multiple users have same min count, use tiebreaker logic
      if (candidatesWithMinCount.length > 1) {
        if (task.fairRotationTimeBased) {
          // Use time-based tie breaking - find who completed the task longest ago
          let oldestCompletionUser = null;
          let oldestCompletionDate = null;

          candidatesWithMinCount.forEach((user) => {
            let lastCompletionDate = null;

            // Find the most recent completion for this user
            if (task.completions) {
              Object.keys(task.completions).forEach((dateStr) => {
                const dayCompletions = task.completions[dateStr];
                if (Array.isArray(dayCompletions)) {
                  dayCompletions.forEach((completion) => {
                    if (completion.user === user) {
                      const completionDate = parseLocalDate(dateStr);
                      if (
                        !lastCompletionDate ||
                        completionDate > lastCompletionDate
                      ) {
                        lastCompletionDate = completionDate;
                      }
                    }
                  });
                }
              });
            }

            // If user never completed, or completed longer ago than current oldest
            if (
              !lastCompletionDate ||
              !oldestCompletionDate ||
              lastCompletionDate < oldestCompletionDate
            ) {
              oldestCompletionDate = lastCompletionDate;
              oldestCompletionUser = user;
            }
          });

          nextUser = oldestCompletionUser || candidatesWithMinCount[0];
        } else {
          // Use rotation order as tiebreaker
          for (let j = 0; j < assignedUsers.length; j++) {
            if (candidatesWithMinCount.includes(assignedUsers[j])) {
              nextUser = assignedUsers[j];
              break;
            }
          }
        }
      } else {
        nextUser = candidatesWithMinCount[0];
      }

      // Check if this user has already completed/is pending for this turn
      let isCompleted = false;
      let isPending = false;

      if (userCompletionCounts[nextUser]) {
        isCompleted = true;
        userCompletionCounts[nextUser]--;
      } else if (userPendingCounts[nextUser]) {
        isPending = true;
        userPendingCounts[nextUser]--;
      }

      turns.push({
        user: nextUser,
        repetition: i + 1,
        isCompleted,
        isPending,
        originalUser: nextUser,
        index: i,
      });

      // Increment the user's completion count for fair distribution in subsequent turns
      allUserCompletions[nextUser]++;
    }

    const completedCount = completions.length + pendingCompletions.length;

    return { turns, completedCount, requiredTimes };
  } catch (err) {
    console.error("Error in fairRotationTurnData:", err);
    return { turns: [], completedCount: 0, requiredTimes: 1 };
  }
}

function mixedTurnData(task, selectedDate) {
  try {
    // Check if fair rotation is enabled
    if (
      task.fairRotation &&
      task.settings &&
      task.settings.includes("Rotation")
    ) {
      return fairRotationTurnData(task, selectedDate);
    }

    if (!task || typeof task !== "object" || !Array.isArray(task.users)) {
      console.error("Invalid task input in mixedTurnData:", task);
      return { turns: [], completedCount: 0, requiredTimes: 1 };
    }

    // Handle "As Needed" tasks which don't have dates
    if (task.asNeeded || task.repeat === "As Needed" || !task.date) {
      return { turns: [], completedCount: 0, requiredTimes: 1 };
    }

    const repeat = task.repeat || "Daily";
    const requiredTimes =
      repeat === "Monthly"
        ? Number.isInteger(task.timesPerMonth)
          ? task.timesPerMonth
          : 1
        : repeat === "Weekly"
          ? Number.isInteger(task.timesPerWeek)
            ? task.timesPerWeek
            : 1
          : repeat === "Daily"
            ? Number.isInteger(task.timesPerDay)
              ? task.timesPerDay
              : 1
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
          if (
            d.getFullYear() === selectedYear &&
            d.getMonth() === selectedMonth
          ) {
            list.push(
              ...(Array.isArray(source[dateStr]) ? source[dateStr] : []),
            );
          }
        }
        return list;
      };
      completions = gather(task.completions);
      pendingCompletions = gather(task.pendingCompletions);
    } else {
      completions = Array.isArray(task.completions?.[selectedDate])
        ? task.completions[selectedDate]
        : [];
      pendingCompletions = Array.isArray(
        task.pendingCompletions?.[selectedDate],
      )
        ? task.pendingCompletions[selectedDate]
        : [];
    }

    const tempTurnReplacement =
      typeof task.tempTurnReplacement?.[selectedDate] === "object"
        ? task.tempTurnReplacement[selectedDate]
        : {};

    const turns = [];
    const userCompletionCounts = {};
    const userPendingCounts = {};

    // Handle merged completion data that includes isPending flag
    completions.forEach((c) => {
      if (c.isPending === true) {
        userPendingCounts[c.user] = (userPendingCounts[c.user] || 0) + 1;
      } else {
        userCompletionCounts[c.user] = (userCompletionCounts[c.user] || 0) + 1;
      }
    });

    // Legacy pending completions (if any still exist separately)
    pendingCompletions.forEach((p) => {
      userPendingCounts[p.user] = (userPendingCounts[p.user] || 0) + 1;
    });

    const userOrder =
      task.rotationOrder &&
      Array.isArray(task.rotationOrder) &&
      task.rotationOrder.length > 0
        ? [...task.rotationOrder]
        : [...task.users];
    const assignedUsers = [...userOrder];

    Object.entries(tempTurnReplacement).forEach(([index, user]) => {
      const i = parseInt(index);
      if (!isNaN(i) && i >= 0 && i < assignedUsers.length) {
        assignedUsers[i] = user;
      }
    });

    // Use the new global occurrence approach for better rotation continuity
    // This ensures rotation continues properly across days
    let currentTurnIndex = 0;
    try {
      if (typeof mixedTurnOffset === "function") {
        currentTurnIndex = mixedTurnOffset(task, selectedDate);
      } else if (typeof task.currentTurnIndex === "number") {
        currentTurnIndex = task.currentTurnIndex;
      } else {
        // Simple fallback rotation based on date
        const dateValue = new Date(selectedDate).getTime();
        currentTurnIndex =
          Math.floor(dateValue / (1000 * 60 * 60 * 24)) % assignedUsers.length;
      }

      // Validate the result
      if (
        typeof currentTurnIndex !== "number" ||
        isNaN(currentTurnIndex) ||
        currentTurnIndex < 0
      ) {
        currentTurnIndex = 0;
      }
      currentTurnIndex = currentTurnIndex % assignedUsers.length;
    } catch (error) {
      console.warn(
        `Turn index calculation error for task "${task.title}":`,
        error,
      );
      currentTurnIndex = 0;
    }

    for (let i = 0; i < requiredTimes; i++) {
      // Calculate global occurrence number for this specific occurrence
      const globalOccurrenceNumber = calculateGlobalOccurrenceNumber(
        task,
        selectedDate,
        i,
      );

      let user, originalUser;

      // Use schedule-based assignment for simple rotation with rotation settings
      if (
        !task.fairRotation &&
        task.settings?.includes("Rotation") &&
        task.rotationSettings
      ) {
        user = calculateScheduledAssignment(task, selectedDate, i);
        originalUser = user; // For simple rotation, assigned user is the original user
      } else {
        // Use existing logic for fair rotation or legacy tasks
        const userIndex = (globalOccurrenceNumber - 1) % assignedUsers.length;
        user = assignedUsers[userIndex];
        originalUser = userOrder[userIndex];
      }

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
        index: i,
        globalOccurrence: globalOccurrenceNumber, // Add global occurrence number for debugging
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
    if (
      !task ||
      typeof task !== "object" ||
      !Array.isArray(task.users) ||
      !task.date
    ) {
      console.error("Invalid task input in individualTurnData:", task);
      return { turns: [], completedCount: 0, requiredTimes: 1 };
    }

    const repeat = task.repeat || "Daily";
    const requiredTimes =
      repeat === "Monthly"
        ? task.timesPerMonth || 1
        : repeat === "Weekly"
          ? task.timesPerWeek || 1
          : repeat === "Daily"
            ? task.timesPerDay || 1
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
          if (
            d.getFullYear() === selectedYear &&
            d.getMonth() === selectedMonth
          ) {
            list.push(
              ...(Array.isArray(source[dateStr]) ? source[dateStr] : []),
            );
          }
        }
        return list;
      };
      completions = gather(task.completions);
      pendingCompletions = gather(task.pendingCompletions);
    } else {
      completions = Array.isArray(task.completions?.[selectedDate])
        ? task.completions[selectedDate]
        : [];
      pendingCompletions = Array.isArray(
        task.pendingCompletions?.[selectedDate],
      )
        ? task.pendingCompletions[selectedDate]
        : [];
    }

    const turns = [];
    const userOrder =
      task.users && Array.isArray(task.users) ? [...task.users] : [];

    let globalIndex = 0;
    for (const user of userOrder) {
      // Handle merged completion data that includes isPending flag
      const userCompletions = completions.filter(
        (c) => c.user === user && c.isPending !== true,
      );
      const userPendings = completions.filter(
        (c) => c.user === user && c.isPending === true,
      );
      // Legacy pending completions (if any still exist separately)
      const legacyPendings = pendingCompletions.filter((p) => p.user === user);

      for (let rep = 1; rep <= requiredTimes; rep++) {
        const isCompleted = userCompletions.some((c) => c.repetition === rep);
        const isPending =
          !isCompleted &&
          (userPendings.some((p) => p.repetition === rep) ||
            legacyPendings.some((p) => p.repetition === rep));

        turns.push({
          user,
          repetition: rep,
          isCompleted,
          isPending,
          index: globalIndex++,
        });
      }
    }

    // completedCount is global, but only for admin/debug views
    const completedCount = completions.length + pendingCompletions.length;

    return {
      turns,
      completedCount,
      requiredTimes, // Per-user requirement
    };
  } catch (err) {
    console.error("Error in individualTurnData:", err);
    return { turns: [], completedCount: 0, requiredTimes: 1 };
  }
}

// addtasks.html settings: Individual ///////////////////////////////////////////////////////////////////////

function calculateIndividualProgress(task, selectedDate, user) {
  const repeat = task.repeat || "Daily";
  const required =
    repeat === "Daily"
      ? task.timesPerDay || 1
      : repeat === "Weekly"
        ? task.timesPerWeek || 1
        : repeat === "Monthly"
          ? task.timesPerMonth || 1
          : 1;

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
          count += dayCompletions.filter((c) => c.user === user).length;
        }
      }
    }

    for (const dateStr in task.pendingCompletions || {}) {
      const d = parseLocalDate(dateStr);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const dayPendings = task.pendingCompletions[dateStr];
        if (Array.isArray(dayPendings)) {
          count += dayPendings.filter((p) => p.user === user).length;
        }
      }
    }
  } else {
    const completions = Array.isArray(task.completions?.[selectedDate])
      ? task.completions[selectedDate]
      : [];
    const pendingCompletions = Array.isArray(
      task.pendingCompletions?.[selectedDate],
    )
      ? task.pendingCompletions[selectedDate]
      : [];
    count =
      completions.filter((c) => c.user === user).length +
      pendingCompletions.filter((p) => p.user === user).length;
  }

  return {
    count,
    required,
    isComplete: count >= required,
  };
}

async function updateUserReward(userName, amount) {
  const adminEmail = localStorage.getItem("currentAdminEmail");
  try {
    const response = await fetch(
      "https://beemazing1.onrender.com/api/rewards",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminEmail, user: userName, amount }),
      },
    );
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
  const time = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateString = now.toLocaleDateString();

  try {
    const response = await fetch(
      `https://beemazing1.onrender.com/api/history?adminEmail=${encodeURIComponent(adminEmail)}`,
    );
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
      body: JSON.stringify({ adminEmail, history }),
    });
  } catch (err) {
    console.error("Error saving task history:", err);
  }
}

async function updateLuckyChestProgress(userName, earnedHoney) {
  const adminEmail = localStorage.getItem("currentAdminEmail");
  try {
    const response = await fetch(
      `https://beemazing1.onrender.com/api/lucky-chests?adminEmail=${encodeURIComponent(adminEmail)}`,
    );
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "Failed to fetch lucky chests");
    const allChests = data.luckyChests || {};
    const userChests = allChests[userName] || [];

    let updated = false;
    userChests.forEach((chest) => {
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
        body: JSON.stringify({ adminEmail, luckyChests: allChests }),
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

// TEST FUNCTION FOR FAIR ROTATION
// Schedule-based rotation assignment function
function calculateScheduledAssignment(task, selectedDate, occurrenceIndex = 0) {
  if (!task.users || task.users.length === 0) {
    return null;
  }

  const rotationSettings = task.rotationSettings;

  // Calculate global occurrence number for this specific occurrence
  const globalOccurrence = calculateGlobalOccurrenceNumber(
    task,
    selectedDate,
    occurrenceIndex,
  );

  switch (rotationSettings.type) {
    case "completion":
      // Each occurrence goes to next user
      return task.users[(globalOccurrence - 1) % task.users.length];

    case "occurrences":
      // Each user gets X occurrences before rotating
      const occurrencesPerUser = rotationSettings.value || 1;
      const userIndex =
        Math.floor((globalOccurrence - 1) / occurrencesPerUser) %
        task.users.length;
      return task.users[userIndex];

    case "time":
      // Calculate based on time units since task start
      const range = task.date.split(" to ");
      const taskStartDate = parseLocalDate(range[0]);
      const currentDate = parseLocalDate(selectedDate);

      const daysSinceStart = Math.floor(
        (currentDate - taskStartDate) / (1000 * 60 * 60 * 24),
      );
      const timeUnit = rotationSettings.unit || "days";
      const rotationValue = rotationSettings.value || 1;

      let rotationPeriods;
      if (timeUnit === "weeks") {
        rotationPeriods = Math.floor(daysSinceStart / (rotationValue * 7));
      } else {
        rotationPeriods = Math.floor(daysSinceStart / rotationValue);
      }

      return task.users[rotationPeriods % task.users.length];

    default:
      // Fallback to simple rotation
      return task.users[(globalOccurrence - 1) % task.users.length];
  }
}

function testFairRotation() {
  console.log("🧪 TESTING FAIR ROTATION LOGIC");
  console.log("=".repeat(50));

  // Test Scenario 1: Equal completions (should follow rotation order)
  console.log("\n📋 Test 1: Equal completions - should follow rotation order");
  const task1 = {
    title: "Test Task 1",
    users: ["Alice", "Bob", "Charlie"],
    fairRotation: true,
    settings: ["Rotation"],
    repeat: "Daily",
    timesPerDay: 1,
    date: "2024-01-01 to 2024-12-31",
    completions: {
      "2024-01-01": [{ user: "Alice" }],
      "2024-01-02": [{ user: "Bob" }],
      "2024-01-03": [{ user: "Charlie" }],
    },
    pendingCompletions: {},
  };

  const result1 = fairRotationTurnData(task1, "2024-01-04");
  console.log("Expected: Alice (first in rotation order with equal counts)");
  console.log("Actual:", result1.turns[0]?.user);
  console.log(
    "✅ Test 1:",
    result1.turns[0]?.user === "Alice" ? "PASSED" : "FAILED",
  );

  // Test Scenario 2: Unequal completions (should pick user with least)
  console.log("\n📋 Test 2: Unequal completions - should pick user with least");
  const task2 = {
    title: "Test Task 2",
    users: ["Alice", "Bob", "Charlie"],
    fairRotation: true,
    settings: ["Rotation"],
    repeat: "Daily",
    timesPerDay: 1,
    date: "2024-01-01 to 2024-12-31",
    completions: {
      "2024-01-01": [{ user: "Alice" }],
      "2024-01-02": [{ user: "Alice" }],
      "2024-01-03": [{ user: "Bob" }],
      "2024-01-04": [{ user: "Alice" }],
    },
    pendingCompletions: {},
  };

  const result2 = fairRotationTurnData(task2, "2024-01-05");
  console.log("Expected: Charlie (0 completions vs Alice:3, Bob:1)");
  console.log("Actual:", result2.turns[0]?.user);
  console.log(
    "✅ Test 2:",
    result2.turns[0]?.user === "Charlie" ? "PASSED" : "FAILED",
  );

  // Test Scenario 3: Multiple turns per day
  console.log("\n📋 Test 3: Multiple turns per day - fair distribution");
  const task3 = {
    title: "Test Task 3",
    users: ["Alice", "Bob"],
    fairRotation: true,
    fairRotationTimeBased: false,
    settings: ["Rotation"],
    repeat: "Daily",
    timesPerDay: 3,
    date: "2024-01-01 to 2024-12-31",
    completions: {
      "2024-01-01": [{ user: "Alice" }, { user: "Bob" }],
    },
    pendingCompletions: {},
  };

  const result3 = fairRotationTurnData(task3, "2024-01-02");
  console.log(
    "Expected turns: Alice (tied, first in order), Bob (fewer after turn 1), Alice (tied again, first in order)",
  );
  console.log(
    "Actual turns:",
    result3.turns.map((t) => `${t.user} (${t.repetition})`),
  );
  const expectedOrder = ["Alice", "Bob", "Alice"];
  const actualOrder = result3.turns.map((t) => t.user);
  const test3Pass =
    JSON.stringify(expectedOrder) === JSON.stringify(actualOrder);
  console.log("✅ Test 3:", test3Pass ? "PASSED" : "FAILED");

  // Test Scenario 4: Including pending completions
  console.log("\n📋 Test 4: Including pending completions in count");
  const task4 = {
    title: "Test Task 4",
    users: ["Alice", "Bob", "Charlie"],
    fairRotation: true,
    settings: ["Rotation"],
    repeat: "Daily",
    timesPerDay: 1,
    date: "2024-01-01 to 2024-12-31",
    completions: {
      "2024-01-01": [{ user: "Alice" }],
      "2024-01-02": [{ user: "Bob" }],
    },
    pendingCompletions: {
      "2024-01-03": [{ user: "Alice" }],
    },
  };

  const result4 = fairRotationTurnData(task4, "2024-01-04");
  console.log("Expected: Charlie (0 total vs Alice:2, Bob:1)");
  console.log("Actual:", result4.turns[0]?.user);
  console.log(
    "✅ Test 4:",
    result4.turns[0]?.user === "Charlie" ? "PASSED" : "FAILED",
  );

  // Test Scenario 5: Time-based tie breaking
  console.log(
    "\n📋 Test 5: Time-based tie breaking - picks user who completed longest ago",
  );
  const task5 = {
    title: "Test Task 5",
    users: ["Alice", "Bob", "Charlie"],
    fairRotation: true,
    fairRotationTimeBased: true,
    settings: ["Rotation"],
    repeat: "Daily",
    timesPerDay: 1,
    date: "2024-01-01 to 2024-12-31",
    completions: {
      "2024-01-01": [{ user: "Alice" }],
      "2024-01-02": [{ user: "Bob" }],
      "2024-01-03": [{ user: "Charlie" }],
      "2024-01-05": [{ user: "Bob" }],
      "2024-01-07": [{ user: "Charlie" }],
    },
    pendingCompletions: {},
  };

  const result5 = fairRotationTurnData(task5, "2024-01-08");
  console.log(
    "Expected: Alice (last completed 2024-01-01, vs Bob:2024-01-05, Charlie:2024-01-07)",
  );
  console.log("Actual:", result5.turns[0]?.user);
  console.log(
    "✅ Test 5:",
    result5.turns[0]?.user === "Alice" ? "PASSED" : "FAILED",
  );

  // Test Scenario 6: Fallback to regular rotation when fairRotation is false
  console.log("\n📋 Test 6: Regular rotation when fairRotation disabled");
  const task6 = {
    title: "Test Task 6",
    users: ["Alice", "Bob", "Charlie"],
    fairRotation: false,
    settings: ["Rotation"],
    repeat: "Daily",
    timesPerDay: 1,
    date: "2024-01-01 to 2024-12-31",
    completions: {
      "2024-01-01": [{ user: "Alice" }],
      "2024-01-02": [{ user: "Alice" }],
      "2024-01-03": [{ user: "Alice" }],
    },
    pendingCompletions: {},
  };

  const result6 = mixedTurnData(task6, "2024-01-04");
  console.log("Expected: Regular rotation logic (not necessarily Charlie)");
  console.log("Actual:", result6.turns[0]?.user);
  console.log(
    "✅ Test 6: Using regular rotation -",
    typeof result6.turns[0]?.user === "string" ? "PASSED" : "FAILED",
  );

  console.log("\n" + "=".repeat(50));
  console.log("🏁 FAIR ROTATION TESTS COMPLETED");
  console.log("Run testFairRotation() in browser console to see results");
}

// Export test function
window.testFairRotation = testFairRotation;
