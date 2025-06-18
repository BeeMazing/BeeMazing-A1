async function showTaskDetails(task) {
    const selectedDate = document.querySelector(".day.selected")?.dataset.date;
    if (!selectedDate) return;

    // Fetch fresh task data to ensure completion status is current
    const adminEmail = localStorage.getItem("currentAdminEmail");
    let freshTask = task;
    try {
        const cacheBreaker = `t=${Date.now()}&r=${Math.random()}&bust=${performance.now()}`;
        const response = await fetch(
            `https://beemazing1.onrender.com/api/tasks?adminEmail=${encodeURIComponent(adminEmail)}&${cacheBreaker}`,
            {
                cache: "no-store",
                headers: {
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    Pragma: "no-cache",
                    Expires: "0",
                },
            },
        );
        if (response.ok) {
            const result = await response.json();
            // Enhanced task matching to handle edited tasks
            let latestTask = null;

            // Method 1: Try exact match first
            latestTask = result.tasks.find(
                (t) => t.title === task.title && t.date === task.date,
            );

            // Method 2: If task has an ID, try ID-based matching
            if (!latestTask && task.id) {
                latestTask = result.tasks.find((t) => t.id === task.id);
            }

            // Method 3: For occurrence tasks, try original title matching
            if (!latestTask && (task.originalTitle || task.occurrence)) {
                const originalTitle = task.originalTitle || task.title.split(" - ")[0];
                latestTask = result.tasks.find(
                    (t) =>
                        (t.originalTitle === originalTitle || t.title === originalTitle) &&
                        t.date === task.date,
                );
            }

            // Method 4: Try matching by creation pattern
            if (!latestTask) {
                const candidateTasks = result.tasks.filter((t) => {
                    const dateMatch =
                        t.date === task.date ||
                        t.date.includes(task.date.split(" to ")[0]) ||
                        task.date.includes(t.date.split(" to ")[0]);
                    return dateMatch;
                });

                if (candidateTasks.length === 1) {
                    latestTask = candidateTasks[0];
                } else if (candidateTasks.length > 1) {
                    const originalUsers = task.users || [];
                    latestTask = candidateTasks.find((t) => {
                        const taskUsers = t.users || [];
                        return originalUsers.some((user) => taskUsers.includes(user));
                    });
                }
            }

            if (latestTask) {
                freshTask = latestTask;
                console.log("🔄 Using fresh task data for modal");
            }
        }
    } catch (error) {
        console.error("Error fetching fresh task data:", error);
    }

    // EXACT COPY FROM userTasks.html - START
    const isRotation = freshTask.settings?.includes("Rotation");
    let turnData;

    if (isRotation) {
        if (typeof mixedTurnData !== "function") {
            console.error(
                `mixedTurnData is not defined for task: ${freshTask.title}`,
            );
            turnData = {
                turns: [],
                completedCount: 0,
                requiredTimes: 1,
            };
        } else {
            turnData = mixedTurnData(freshTask, selectedDate);
        }
    } else {
        if (typeof individualTurnData !== "function") {
            console.error(
                `individualTurnData is not defined for task: ${freshTask.title}`,
            );
            turnData = {
                turns: [],
                completedCount: 0,
                requiredTimes: 1,
            };
        } else {
            try {
                turnData = individualTurnData(freshTask, selectedDate);
            } catch (error) {
                console.error(
                    `Error in individualTurnData for task ${freshTask.title}:`,
                    error,
                );
                turnData = {
                    turns: [],
                    completedCount: 0,
                    requiredTimes: 1,
                };
            }
        }
    }

    const userName = localStorage.getItem("currentUser");
    const userTurns = turnData.turns.filter(
        (turn) => turn.user === userName,
    );
    const userTotal = userTurns.reduce(
        (sum, turn) =>
            sum + (turn.isCompleted || turn.isPending ? 1 : 0),
        0,
    );
    const userRequiredTimes = isRotation
        ? userTurns.length
        : turnData.requiredTimes;

    // Determine task status and symbol
    let statusSymbol = "";
    let isOverdue = false;
    let isPending = false;
    let isApproved = false;

    // Check if task is overdue
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const currentDate = new Date().toLocaleDateString("sv-SE");

    if (selectedDate === currentDate) {
        if (freshTask.dueTimes && freshTask.dueTimes.length > 0) {
            // Tasks with specific due times - check if any due time has passed
            for (const timeStr of freshTask.dueTimes) {
                const [hours, minutes] = timeStr
                    .split(":")
                    .map(Number);
                const dueTime = hours * 60 + minutes;
                if (currentTime > dueTime) {
                    isOverdue = true;
                    break;
                }
            }
        } else {
            // Tasks without due times - overdue after midnight if not completed
            const hasCompletions = turnData.completedCount > 0;
            if (!hasCompletions && currentTime > 0) {
                // It's past midnight and task is not completed
                isOverdue = true;
            }
        }
    } else if (selectedDate < currentDate) {
        // Task is from a previous date and not completed
        const hasCompletions = turnData.completedCount > 0;
        if (!hasCompletions) {
            isOverdue = true;
        }
    }

    // Check completion status using proper completion data
    const hasCompletions = turnData.completedCount > 0;
    if (hasCompletions && freshTask.parentApproval === true) {
        // Check pending and approved users using same logic as main code
        const pendingUsers = [];
        const approvedUsers = [];

        // Check ALL completions (including cross-completions)
        const allCompletions = [];

        // Get all completions from completedDates format
        if (
            freshTask.completedDates &&
            freshTask.completedDates[selectedDate]
        ) {
            allCompletions.push(
                ...freshTask.completedDates[selectedDate],
            );
        }
        // Fallback to completions format
        else if (
            freshTask.completions &&
            freshTask.completions[selectedDate]
        ) {
            allCompletions.push(
                ...freshTask.completions[selectedDate].filter(
                    (c) => c.isCompleted || !c.isPending,
                ),
            );
        }

        // Update isPending status from completions data
        if (freshTask.completions && freshTask.completions[selectedDate]) {
            const completionsData = freshTask.completions[selectedDate];
            allCompletions.forEach((completion) => {
                const matchingCompletion = completionsData.find(
                    (c) => c.user === completion.user,
                );
                if (matchingCompletion) {
                    completion.isPending =
                        matchingCompletion.isPending;
                }
            });
        }

        // Process all completions
        allCompletions.forEach((completion) => {
            const user = completion.user;
            if (completion.isPending === true) {
                if (!pendingUsers.includes(user)) {
                    pendingUsers.push(user);
                }
            } else {
                if (!approvedUsers.includes(user)) {
                    approvedUsers.push(user);
                }
            }
        });

        if (pendingUsers.length > 0 && approvedUsers.length === 0) {
            isPending = true;
        } else if (approvedUsers.length > 0) {
            isApproved = true;
        }
    } else if (hasCompletions) {
        // Non-approval tasks are approved when completed
        isApproved = true;
    }

    // Set status symbol
    if (isOverdue) {
        statusSymbol =
            ' <span style="display: inline-flex; align-items: center; justify-content: center; margin-left: 8px; width: 20px; height: 20px; border-radius: 50%; background: #d32f2f; color: white; font-size: 14px; font-weight: bold;">!</span>';
    } else if (isPending) {
        statusSymbol =
            ' <span style="display: inline-flex; align-items: center; justify-content: center; margin-left: 8px; width: 20px; height: 20px; border-radius: 50%; background: var(--primary-color);"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6,2V8H6V8L10,12L6,16V16H6V22H18V16H18V16L14,12L18,8V8H18V2H6M16,16.5V20H8V16.5L12,12.5L16,16.5M12,11.5L8,7.5V4H16V7.5L12,11.5Z" fill="white"/></svg></span>';
    } else if (isApproved) {
        statusSymbol =
            ' <span style="display: inline-flex; align-items: center; justify-content: center; margin-left: 8px; width: 20px; height: 20px; border-radius: 50%; background: #28a745; color: white; font-size: 14px; font-weight: bold;">✓</span>';
    }

    let modalHTML = `<h2>${freshTask.title}${statusSymbol}</h2>`;

    // Check if this is an occurrence task and add master task button
    if (
        freshTask.originalTitle &&
        freshTask.occurrence &&
        freshTask.totalOccurrences
    ) {
        modalHTML += `<div style="border-bottom: 1px solid var(--primary-color); padding: 3px 0; margin-bottom: 6px; font-size: 12px; line-height: 1;">`;
        modalHTML += `<strong style="margin: 0; padding: 0; line-height: 1;">This is occurrence ${freshTask.occurrence} of ${freshTask.totalOccurrences}</strong> `;
        modalHTML += `<button type="button" onclick="showMasterTaskDetails('${freshTask.originalTitle}', '${selectedDate}', ${JSON.stringify(freshTask).replace(/"/g, "&quot;")})" style="
            margin-left: 8px;
            padding: 4px 8px;
            background: var(--primary-color);
            color: var(--secondary-color);
            border: none;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            vertical-align: middle;
        " onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
            View Full Task
        </button>`;
        modalHTML += `</div>`;
    }

    // Buzz Points
    modalHTML += `<div class="task-info-row"><strong>Buzz Points:</strong> ${freshTask.reward || 0} 🍯</div>`;

    // Status (simple)
    let statusDisplay = "";
    if (isOverdue && !isApproved && !isPending) {
        statusDisplay = "Overdue";
    } else if (isApproved) {
        statusDisplay = "Approved";
    } else if (isPending) {
        statusDisplay = "Pending";
    } else {
        statusDisplay = "Active";
    }
    modalHTML += `<div class="task-info-row"><strong>Status:</strong> ${statusDisplay}</div>`;

    // Completion Details (separate section)
    let completionTime = "";
    let completerUser = "";

    if (
        (isApproved || isPending) &&
        freshTask.completedDates &&
        freshTask.completedDates[selectedDate] &&
        freshTask.completedDates[selectedDate].length > 0
    ) {
        const latestCompletion =
            freshTask.completedDates[selectedDate][
                freshTask.completedDates[selectedDate].length - 1
            ];
        if (latestCompletion.completedAt) {
            const completedTimeObj = new Date(
                latestCompletion.completedAt,
            );
            completionTime = completedTimeObj.toLocaleTimeString(
                "en-US",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                },
            );
            completerUser = latestCompletion.user;
        }
    }

    if (completionTime && completerUser) {
        let avatarHTML = "";
        if (
            window.avatarSystem &&
            typeof window.avatarSystem.generateAvatarHTML ===
                "function"
        ) {
            avatarHTML = window.avatarSystem.generateAvatarHTML(
                completerUser,
                24,
                "completer-avatar",
                "",
            );
        }
        modalHTML += `<div class="task-info-row"><strong>Completion Details:</strong> ${completionTime} by ${avatarHTML}</div>`;
    }

    // Notes (if present)
    if (freshTask.notes) {
        modalHTML += `<div class="task-info-row"><strong>Notes:</strong> ${freshTask.notes}</div>`;
    }

    // Room (if present)
    if (freshTask.room) {
        modalHTML += `<div class="task-info-row"><strong>Room:</strong> ${freshTask.room}</div>`;
    }

    // Frequency (simple)
    let frequencyDisplay = freshTask.repeat || "Daily";
    modalHTML += `<div class="task-info-row"><strong>Frequency:</strong> ${frequencyDisplay}</div>`;

    // Additional Settings (when applicable)
    if (freshTask.repeat && freshTask.repeat !== "One time") {
        let additionalSettings = [];

        if (freshTask.repeat === "Daily") {
            // Check for times per day
            if (freshTask.timesPerDay && freshTask.timesPerDay > 1) {
                additionalSettings.push(
                    `${freshTask.timesPerDay} times per day`,
                );
            }
            // Check for specific days of week
            if (freshTask.daysOfWeek && freshTask.daysOfWeek.length > 0) {
                if (
                    freshTask.daysOfWeek.includes("All") ||
                    freshTask.daysOfWeek.length === 7
                ) {
                    additionalSettings.push("All days");
                } else if (!freshTask.daysOfWeek.includes("Any")) {
                    // Filter out day names that are actually day names
                    const validDays = freshTask.daysOfWeek.filter(
                        (day) =>
                            typeof day === "string" &&
                            [
                                "Monday",
                                "Tuesday",
                                "Wednesday",
                                "Thursday",
                                "Friday",
                                "Saturday",
                                "Sunday",
                            ].includes(day),
                    );
                    if (validDays.length > 0) {
                        const shortDays = validDays.map((day) =>
                            day.substring(0, 3),
                        );
                        additionalSettings.push(
                            shortDays.join(", "),
                        );
                    }
                }
            }
        } else if (freshTask.repeat === "Weekly") {
            // Check for times per week
            if (freshTask.timesPerWeek && freshTask.timesPerWeek > 1) {
                additionalSettings.push(
                    `${freshTask.timesPerWeek} times per week`,
                );
            }
            // Check for specific days of week
            if (freshTask.daysOfWeek && freshTask.daysOfWeek.length > 0) {
                if (!freshTask.daysOfWeek.includes("Any")) {
                    const validDays = freshTask.daysOfWeek.filter(
                        (day) =>
                            typeof day === "string" &&
                            [
                                "Monday",
                                "Tuesday",
                                "Wednesday",
                                "Thursday",
                                "Friday",
                                "Saturday",
                                "Sunday",
                            ].includes(day),
                    );
                    if (validDays.length > 0) {
                        const shortDays = validDays.map((day) =>
                            day.substring(0, 3),
                        );
                        additionalSettings.push(
                            shortDays.join(", "),
                        );
                    }
                }
            }
        } else if (freshTask.repeat === "Monthly") {
            // Handle new monthly options structure
            if (freshTask.monthlyOption === "times") {
                // Check for times per month
                if (freshTask.timesPerMonth && freshTask.timesPerMonth > 1) {
                    additionalSettings.push(
                        `${freshTask.timesPerMonth} times per month`,
                    );
                }

                // Handle specific days of the month
                if (
                    freshTask.monthlySchedulingType === "daysOfMonth" &&
                    freshTask.monthlyDaysOfMonth
                ) {
                    const days = freshTask.monthlyDaysOfMonth.split(",");
                    const dayNames = days.map((day) => {
                        if (day === "last") return "Last";
                        const num = parseInt(day);
                        if (num === 1) return "1st";
                        if (num === 2) return "2nd";
                        if (num === 3) return "3rd";
                        if (num === 21) return "21st";
                        if (num === 22) return "22nd";
                        if (num === 23) return "23rd";
                        if (num === 31) return "31st";
                        return `${num}th`;
                    });
                    additionalSettings.push(
                        `Days: ${dayNames.join(", ")}`,
                    );
                }

                // Handle specific days of the week patterns
                if (
                    freshTask.monthlySchedulingType === "daysOfWeek" &&
                    freshTask.monthlyDaysOfWeek
                ) {
                    const patterns =
                        freshTask.monthlyDaysOfWeek.split(",");
                    const patternNames = patterns.map((pattern) => {
                        const [occurrence, weekday] =
                            pattern.split(":");
                        const occurrenceNames = {
                            1: "1st",
                            2: "2nd",
                            3: "3rd",
                            4: "4th",
                            last: "Last",
                        };
                        return `${occurrenceNames[occurrence]} ${weekday}`;
                    });
                    additionalSettings.push(
                        `Patterns: ${patternNames.join(", ")}`,
                    );
                }
            } else if (freshTask.monthlyOption === "interval") {
                const interval = freshTask.monthInterval || 1;
                additionalSettings.push(
                    interval === 1
                        ? "Every month"
                        : `Every ${interval} months`,
                );
            }
            // Legacy support for old format
            else if (freshTask.monthlyOption === "specific") {
                additionalSettings.push(`Day ${freshTask.monthlyDay}`);
            } else if (
                freshTask.monthlyOption === "pattern" &&
                freshTask.monthlyWeek &&
                freshTask.monthlyWeekday
            ) {
                const weekNames = [
                    "First",
                    "Second",
                    "Third",
                    "Fourth",
                    "Last",
                ];
                const dayNames = [
                    "Sun",
                    "Mon",
                    "Tue",
                    "Wed",
                    "Thu",
                    "Fri",
                    "Sat",
                ];
                additionalSettings.push(
                    `${weekNames[freshTask.monthlyWeek - 1]} ${dayNames[freshTask.monthlyWeekday]}`,
                );
            }
        }

        if (additionalSettings.length > 0) {
            modalHTML += `<div class="task-info-row"><strong>Additional Settings:</strong> ${additionalSettings.join(", ")}</div>`;
        }
    }

    // Date
    const [fromDate, toDate] = (freshTask.date || "").split(" to ");
    let dateDisplay = "";
    if (freshTask.repeat === "Occasional") {
        dateDisplay = "No fixed date";
    } else if (!fromDate) {
        dateDisplay = "Unknown";
    } else if (
        !toDate ||
        toDate === "3000-01-01" ||
        toDate === fromDate
    ) {
        dateDisplay = fromDate;
    } else {
        dateDisplay = `From ${fromDate} to ${toDate}`;
    }
    modalHTML += `<div class="task-info-row"><strong>Date:</strong> ${dateDisplay}</div>`;

    // Due Time
    if (freshTask.dueTimes && freshTask.dueTimes.length > 0) {
        modalHTML += `<div class="task-info-row"><strong>Due Time:</strong> ${freshTask.dueTimes.join(", ")}</div>`;
    }

    // Setting
    let settingDisplay = "Individual";
    if (freshTask.settings?.includes("Rotation")) {
        settingDisplay = "Rotational";
    } else if (freshTask.settings?.includes("Teamwork")) {
        settingDisplay = "Teamwork";
    }
    modalHTML += `<div class="task-info-row"><strong>Setting:</strong> ${settingDisplay}</div>`;

    // Additional Details for Rotational
    if (freshTask.settings?.includes("Rotation")) {
        let rotationDetails = [];
        if (freshTask.fairRotation) {
            rotationDetails.push("Fair Task Rotation");
        }
        if (rotationDetails.length > 0) {
            modalHTML += `<div class="task-info-row"><strong>Additional Details:</strong> ${rotationDetails.join(", ")}</div>`;
        }
    }

    // Assigned To (avatars only)
    let assignedDisplay = "";
    if (freshTask.settings?.includes("Teamwork")) {
        // For teamwork, list all avatars
        freshTask.users.forEach((user) => {
            if (
                window.avatarSystem &&
                typeof window.avatarSystem.generateAvatarHTML ===
                    "function"
            ) {
                assignedDisplay +=
                    window.avatarSystem.generateAvatarHTML(
                        user,
                        24,
                        "assigned-avatar",
                        "margin-right: 2px;",
                    );
            }
        });
    } else if (freshTask.settings?.includes("Rotation")) {
        // For rotation, show current assignee first, then order
        const activeTurn = turnData.turns.find(
            (turn) => !turn.isCompleted && !turn.isPending,
        );
        if (activeTurn) {
            if (
                window.avatarSystem &&
                typeof window.avatarSystem.generateAvatarHTML ===
                    "function"
            ) {
                assignedDisplay +=
                    window.avatarSystem.generateAvatarHTML(
                        activeTurn.user,
                        24,
                        "current-avatar",
                        "margin-right: 2px; border: 2px solid var(--primary-color);",
                    );
            }

            // Add rotation order
            const orderedUsers = freshTask.users.slice();
            const currentIndex = orderedUsers.indexOf(
                activeTurn.user,
            );
            const rotationOrder = [
                ...orderedUsers.slice(currentIndex + 1),
                ...orderedUsers.slice(0, currentIndex),
            ];

            if (rotationOrder.length > 0) {
                rotationOrder.forEach((user) => {
                    if (
                        window.avatarSystem &&
                        typeof window.avatarSystem
                            .generateAvatarHTML === "function"
                    ) {
                        assignedDisplay +=
                            window.avatarSystem.generateAvatarHTML(
                                user,
                                24,
                                "rotation-avatar",
                                "margin-right: 2px;",
                            );
                    }
                });
            }
        } else {
            // Fallback
            freshTask.users.forEach((user) => {
                if (
                    window.avatarSystem &&
                    typeof window.avatarSystem
                        .generateAvatarHTML === "function"
                ) {
                    assignedDisplay +=
                        window.avatarSystem.generateAvatarHTML(
                            user,
                            24,
                            "assigned-avatar",
                            "margin-right: 2px;",
                        );
                }
            });
        }
    } else {
        // For individual, list all assigned users
        freshTask.users.forEach((user) => {
            if (
                window.avatarSystem &&
                typeof window.avatarSystem.generateAvatarHTML ===
                    "function"
            ) {
                assignedDisplay +=
                    window.avatarSystem.generateAvatarHTML(
                        user,
                        24,
                        "assigned-avatar",
                        "margin-right: 2px;",
                    );
            }
        });
    }
    modalHTML += `<div class="task-info-row"><strong>Assigned To:</strong><div class="avatar-container">${assignedDisplay}</div></div>`;

    // Reassigned To (if applicable)
    let reassignedUser = null;
    if (
        freshTask.tempTurnReplacement &&
        freshTask.tempTurnReplacement[selectedDate]
    ) {
        const replacements = freshTask.tempTurnReplacement[selectedDate];
        for (const [index, replacementUser] of Object.entries(
            replacements,
        )) {
            if (freshTask.users && freshTask.users[parseInt(index)]) {
                reassignedUser = replacementUser;
                break;
            }
        }
    }

    if (reassignedUser) {
        let reassignedAvatar = "";
        if (
            window.avatarSystem &&
            typeof window.avatarSystem.generateAvatarHTML ===
                "function"
        ) {
            reassignedAvatar =
                window.avatarSystem.generateAvatarHTML(
                    reassignedUser,
                    24,
                    "reassigned-avatar",
                    "",
                );
        }
        modalHTML += `<div class="task-info-row"><strong>Reassigned To:</strong><div class="avatar-container">${reassignedAvatar}</div></div>`;
    }

    // Parental Approval
    const approvalDisplay =
        freshTask.parentApproval === true ? "Yes" : "No";
    modalHTML += `<div class="task-info-row"><strong>Parental Approval:</strong> ${approvalDisplay}</div>`;

    // On-time Completion
    const onTimeDisplay =
        freshTask.onTimeCompletion === true ? "Yes" : "No";
    modalHTML += `<div class="task-info-row"><strong>On-time Completion:</strong> ${onTimeDisplay}</div>`;

    // Privacy Status
    const privacyDisplay =
        freshTask.isPrivate === true
            ? "Private"
            : "Visible to all users";
    modalHTML += `<div class="task-info-row"><strong>Privacy Status:</strong> ${privacyDisplay}</div>`;

    // EXACT COPY FROM userTasks.html - END

    // ADMIN BUTTONS ADDITION - START
    // Check if task can be completed - anyone can complete any task
    const currentUser = localStorage.getItem("currentUser");
    const currentUserEmail = localStorage.getItem("currentUserEmail") || adminEmail;
    const isParent = currentUserEmail === adminEmail;
    const canComplete = !freshTask.asNeeded && freshTask.users && freshTask.users.length > 0;
    const completedUsersForButton = Array.isArray(freshTask.completions?.[selectedDate])
        ? freshTask.completions[selectedDate]
        : [];
    const pendingUsersForButton = completedUsersForButton.filter((c) => c.isPending);
    const approvedUsersForButton = completedUsersForButton.filter((c) => !c.isPending);
    const isTaskComplete = approvedUsersForButton.length > 0 || pendingUsersForButton.length > 0;

    // Admin buttons section (preserved from original tasks.html)
    modalHTML += `
        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #FBB740;">
            ${
                canComplete && !isTaskComplete
                    ? `
                <div style="margin-bottom: 15px; text-align: center;">
                    <button id="completeTaskBtn" style="padding: 10px 20px; background: #28a745; color: white; font-weight: 600; border-radius: 8px; border: none; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 8px; margin: 0 auto;">
                        ✓ Mark as Done
                    </button>
                </div>
            `
                    : ""
            }
            <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;">
                <button id="editOccurrenceBtn" style="padding: 8px 16px; background: #FBB740; color: #5D4E41; font-weight: 500; border-radius: 6px; border: none; cursor: pointer; font-size: 13px;">Edit This Day</button>
                <button id="editFutureBtn" style="padding: 8px 16px; background: #e4e3e0; color: #5D4E41; font-weight: 500; border-radius: 6px; border: none; cursor: pointer; font-size: 13px;">Edit Future</button>
                <button id="editTaskBtn" style="padding: 8px 16px; background: #e4e3e0; color: #5D4E41; font-weight: 500; border-radius: 6px; border: none; cursor: pointer; font-size: 13px;">Edit Entire Task</button>
                <button id="deleteOccurrenceBtn" style="padding: 8px 16px; background: #D32F2F; color: white; font-weight: 500; border-radius: 6px; border: none; cursor: pointer; font-size: 13px;">Delete This Day</button>
                <button id="deleteFutureBtn" style="padding: 8px 16px; background: #D32F2F; color: white; font-weight: 500; border-radius: 6px; border: none; cursor: pointer; font-size
