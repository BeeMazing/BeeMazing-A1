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

            if (latestTask) {
                freshTask = latestTask;
                console.log("🔄 Using fresh task data for modal");
            }
        }
    } catch (error) {
        console.error("Error fetching fresh task data:", error);
    }

    // Universal task details styling and logic from userTasks.html
    const userOrder = freshTask.users && Array.isArray(freshTask.users) ? [...freshTask.users] : [];

    // Determine task status and symbols
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
                const [hours, minutes] = timeStr.split(":").map(Number);
                const dueTime = hours * 60 + minutes;
                if (currentTime > dueTime) {
                    isOverdue = true;
                    break;
                }
            }
        } else {
            // Tasks without due times - overdue after midnight if not completed
            const hasCompletions = Array.isArray(freshTask.completions?.[selectedDate]) &&
                                 freshTask.completions[selectedDate].some(c => !c.isPending);
            if (!hasCompletions && currentTime > 0) {
                isOverdue = true;
            }
        }
    } else if (selectedDate < currentDate) {
        // Task is from a previous date and not completed
        const hasCompletions = Array.isArray(freshTask.completions?.[selectedDate]) &&
                             freshTask.completions[selectedDate].some(c => !c.isPending);
        if (!hasCompletions) {
            isOverdue = true;
        }
    }

    // Check completion status
    const completedUsers = Array.isArray(freshTask.completions?.[selectedDate])
        ? freshTask.completions[selectedDate]
        : [];
    const pendingUsers = completedUsers.filter((c) => c.isPending);
    const approvedUsers = completedUsers.filter((c) => !c.isPending);

    if (approvedUsers.length > 0) {
        isApproved = true;
    } else if (pendingUsers.length > 0) {
        isPending = true;
    }

    // Set status symbol with universal design
    if (isOverdue && !isApproved && !isPending) {
        statusSymbol = ' <span style="display: inline-flex; align-items: center; justify-content: center; margin-left: 8px; width: 20px; height: 20px; border-radius: 50%; background: #d32f2f; color: white; font-size: 14px; font-weight: bold;">!</span>';
    } else if (isPending) {
        statusSymbol = ' <span style="display: inline-flex; align-items: center; justify-content: center; margin-left: 8px; width: 20px; height: 20px; border-radius: 50%; background: var(--primary-color);"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6,2V8H6V8L10,12L6,16V16H6V22H18V16H18V16L14,12L18,8V8H18V2H6M16,16.5V20H8V16.5L12,12.5L16,16.5M12,11.5L8,7.5V4H16V7.5L12,11.5Z" fill="white"/></svg></span>';
    } else if (isApproved) {
        statusSymbol = ' <span style="display: inline-flex; align-items: center; justify-content: center; margin-left: 8px; width: 20px; height: 20px; border-radius: 50%; background: #28a745; color: white; font-size: 14px; font-weight: bold;">✓</span>';
    }

    let modalHTML = `<h2>${freshTask.title}${statusSymbol}</h2>`;

    // Check if this is an occurrence task and add master task button
    if (freshTask.originalTitle && freshTask.occurrence && freshTask.totalOccurrences) {
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

    if ((isApproved || isPending) && freshTask.completedDates && freshTask.completedDates[selectedDate] && freshTask.completedDates[selectedDate].length > 0) {
        const latestCompletion = freshTask.completedDates[selectedDate][freshTask.completedDates[selectedDate].length - 1];
        if (latestCompletion.completedAt) {
            const completedTimeObj = new Date(latestCompletion.completedAt);
            completionTime = completedTimeObj.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
            });
            completerUser = latestCompletion.user;
        }
    }

    if (completionTime && completerUser) {
        let avatarHTML = "";
        if (window.avatarSystem && typeof window.avatarSystem.generateAvatarHTML === "function") {
            avatarHTML = window.avatarSystem.generateAvatarHTML(completerUser, 24, "completer-avatar", "");
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
                additionalSettings.push(`${freshTask.timesPerDay} times per day`);
            }
            // Check for specific days of week
            if (freshTask.daysOfWeek && freshTask.daysOfWeek.length > 0) {
                if (freshTask.daysOfWeek.includes("All") || freshTask.daysOfWeek.length === 7) {
                    additionalSettings.push("All days");
                } else if (!freshTask.daysOfWeek.includes("Any")) {
                    const validDays = freshTask.daysOfWeek.filter(day =>
                        typeof day === "string" &&
                        ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].includes(day)
                    );
                    if (validDays.length > 0) {
                        const shortDays = validDays.map(day => day.substring(0, 3));
                        additionalSettings.push(shortDays.join(", "));
                    }
                }
            }
        } else if (freshTask.repeat === "Weekly") {
            // Check for times per week
            if (freshTask.timesPerWeek && freshTask.timesPerWeek > 1) {
                additionalSettings.push(`${freshTask.timesPerWeek} times per week`);
            }
            // Check for specific days of week
            if (freshTask.daysOfWeek && freshTask.daysOfWeek.length > 0) {
                if (!freshTask.daysOfWeek.includes("Any")) {
                    const validDays = freshTask.daysOfWeek.filter(day =>
                        typeof day === "string" &&
                        ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].includes(day)
                    );
                    if (validDays.length > 0) {
                        const shortDays = validDays.map(day => day.substring(0, 3));
                        additionalSettings.push(shortDays.join(", "));
                    }
                }
            }
        } else if (freshTask.repeat === "Monthly") {
            // Handle new monthly options structure
            if (freshTask.monthlyOption === "times") {
                // Check for times per month
                if (freshTask.timesPerMonth && freshTask.timesPerMonth > 1) {
                    additionalSettings.push(`${freshTask.timesPerMonth} times per month`);
                }

                // Handle specific days of the month
                if (freshTask.monthlySchedulingType === "daysOfMonth" && freshTask.monthlyDaysOfMonth) {
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
                    additionalSettings.push(`Days: ${dayNames.join(", ")}`);
                }

                // Handle specific days of the week patterns
                if (freshTask.monthlySchedulingType === "daysOfWeek" && freshTask.monthlyDaysOfWeek) {
                    const patterns = freshTask.monthlyDaysOfWeek.split(",");
                    const patternNames = patterns.map((pattern) => {
                        const [occurrence, weekday] = pattern.split(":");
                        const occurrenceNames = {
                            1: "1st", 2: "2nd", 3: "3rd", 4: "4th", last: "Last"
                        };
                        return `${occurrenceNames[occurrence]} ${weekday}`;
                    });
                    additionalSettings.push(`Patterns: ${patternNames.join(", ")}`);
                }
            } else if (freshTask.monthlyOption === "interval") {
                const interval = freshTask.monthInterval || 1;
                additionalSettings.push(interval === 1 ? "Every month" : `Every ${interval} months`);
            }
            // Legacy support for old format
            else if (freshTask.monthlyOption === "specific") {
                additionalSettings.push(`Day ${freshTask.monthlyDay}`);
            } else if (freshTask.monthlyOption === "pattern" && freshTask.monthlyWeek && freshTask.monthlyWeekday) {
                const weekNames = ["First", "Second", "Third", "Fourth", "Last"];
                const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                additionalSettings.push(`${weekNames[freshTask.monthlyWeek - 1]} ${dayNames[freshTask.monthlyWeekday]}`);
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
    } else if (!toDate || toDate === "3000-01-01" || toDate === fromDate) {
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

    // Assigned To (avatars only) with universal styling
    let assignedDisplay = "";
    if (freshTask.settings?.includes("Teamwork")) {
        // For teamwork, list all avatars
        freshTask.users.forEach((user) => {
            if (window.avatarSystem && typeof window.avatarSystem.generateAvatarHTML === "function") {
                assignedDisplay += window.avatarSystem.generateAvatarHTML(user, 24, "assigned-avatar", "margin-right: 2px;");
            }
        });
    } else if (freshTask.settings?.includes("Rotation")) {
        // For rotation, show current assignee first, then order (simplified for tasks.html)
        freshTask.users.forEach((user) => {
            if (window.avatarSystem && typeof window.avatarSystem.generateAvatarHTML === "function") {
                assignedDisplay += window.avatarSystem.generateAvatarHTML(user, 24, "assigned-avatar", "margin-right: 2px;");
            }
        });
    } else {
        // For individual, list all assigned users
        freshTask.users.forEach((user) => {
            if (window.avatarSystem && typeof window.avatarSystem.generateAvatarHTML === "function") {
                assignedDisplay += window.avatarSystem.generateAvatarHTML(user, 24, "assigned-avatar", "margin-right: 2px;");
            }
        });
    }
    modalHTML += `<div class="task-info-row"><strong>Assigned To:</strong><div class="avatar-container">${assignedDisplay}</div></div>`;

    // Parental Approval
    const approvalDisplay = freshTask.parentApproval === true ? "Yes" : "No";
    modalHTML += `<div class="task-info-row"><strong>Parental Approval:</strong> ${approvalDisplay}</div>`;

    // On-time Completion
    const onTimeDisplay = freshTask.onTimeCompletion === true ? "Yes" : "No";
    modalHTML += `<div class="task-info-row"><strong>On-time Completion:</strong> ${onTimeDisplay}</div>`;

    // Privacy Status
    const privacyDisplay = freshTask.isPrivate === true ? "Private" : "Visible to all users";
    modalHTML += `<div class="task-info-row"><strong>Privacy Status:</strong> ${privacyDisplay}</div>`;

    // Admin buttons section - preserved from original tasks.html
    const isLoggedInAsAdmin = localStorage.getItem("isAdmin") === "true";
    if (isLoggedInAsAdmin) {
        modalHTML += `
        <div style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #fbb740;">
            <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;">
                <button id="editOccurrenceBtn" style="padding: 8px 16px; background: #FBB740; color: #5D4E41; font-weight: 500; border-radius: 6px; border: none; cursor: pointer; font-size: 13px;">Edit This Day</button>
                <button id="editFutureBtn" style="padding: 8px 16px; background: #e4e3e0; color: #5D4E41; font-weight: 500; border-radius: 6px; border: none; cursor: pointer; font-size: 13px;">Edit Future</button>
                <button id="editTaskBtn" style="padding: 8px 16px; background: #e4e3e0; color: #5D4E41; font-weight: 500; border-radius: 6px; border: none; cursor: pointer; font-size: 13px;">Edit Entire Task</button>
                <button id="deleteOccurrenceBtn" style="padding: 8px 16px; background: #D32F2F; color: white; font-weight: 500; border-radius: 6px; border: none; cursor: pointer; font-size: 13px;">Delete This Day</button>
                <button id="deleteFutureBtn" style="padding: 8px 16px; background: #D32F2F; color: white; font-weight: 500; border-radius: 6px; border: none; cursor: pointer; font-size: 13px;">Delete Future</button>
                <button id="deleteEntireTaskBtn" style="padding: 8px 16px; background: #D32F2F; color: white; font-weight: 500; border-radius: 6px; border: none; cursor: pointer; font-size: 13px;">Delete Entire Task</button>
            </div>
        </div>`;
    }

    // Create modal with universal styling
    const modal = document.createElement("div");
    modal.className = "task-modal";
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;

    const modalContent = document.createElement("div");
    modalContent.className = "modal-content";
    modalContent.style.cssText = `
        background: #fffff8;
        padding: 25px;
        border-radius: 15px;
        width: 90%;
        max-width: 420px;
        max-height: 85vh;
        overflow-y: auto;
        text-align: left;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        border: 2px solid #fbb740;
        color: #5d4e41;
        font-family: "Poppins", Arial, sans-serif;
    `;

    modalContent.innerHTML = modalHTML;
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Apply universal task-info-row styling
    const style = document.createElement("style");
    style.textContent = `
        .task-info-row {
            padding: 8px 0;
            border-bottom: 1px solid #fff6e9;
            font-size: 12px;
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 4px;
            min-height: 32px;
        }
        .task-info-row strong {
            min-width: fit-content;
            margin-right: 8px;
            color: #5d4e41;
            font-weight: 600;
        }
        .task-info-row .avatar-container {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 2px;
            flex: 1;
        }
        .task-info-row:last-child {
            border-bottom: none;
        }
        .modal-content h2 {
            color: #5d4e41;
            margin: 0 0 12px 0;
            font-size: 16px;
            font-weight: 600;
            border-bottom: 2px solid #fbb740;
            padding-bottom: 6px;
        }
    `;
    document.head.appendChild(style);

    // Modal click to close
    modal.addEventListener("click", (e) => {
        if (e.target.classList.contains("task-modal")) {
            modal.remove();
            style.remove();
        }
    });

    // Add admin button event listeners (preserved from original tasks.html)
    if (isLoggedInAsAdmin) {
        // Edit This Day button
        const editOccurrenceBtn = document.getElementById("editOccurrenceBtn");
        if (editOccurrenceBtn) {
            editOccurrenceBtn.addEventListener("click", async () => {
                // Check if this is an occurrence task
                const isOccurrenceTask = freshTask.originalTitle && freshTask.occurrence;
                const isOccurrenceByTitle = freshTask.title.includes(" - ") && /\d+(st|nd|rd|th)$/.test(freshTask.title);

                if (isOccurrenceTask || isOccurrenceByTitle) {
                    // For occurrence tasks, edit the specific occurrence
                    localStorage.setItem("familyApp_editTask", JSON.stringify(freshTask));
                    localStorage.setItem("familyApp_editTask_index", "0");
                } else {
                    // For regular tasks, create edit data for this specific date
                    const editData = {
                        ...freshTask,
                        editMode: "occurrence",
                        editDate: selectedDate,
                    };
                    localStorage.setItem("familyApp_editTask", JSON.stringify(editData));
                    localStorage.setItem("familyApp_editTask_index", "0");
                }

                const admin = localStorage.getItem("currentAdminEmail");
                const user = localStorage.getItem("currentUser");
                if (admin && user) {
                    window.location.href = `/BeeMazing-A1/mobile/3-Tasks/addtasks.html?admin=${encodeURIComponent(admin)}&user=${encodeURIComponent(user)}`;
                }
            });
        }

        // Edit Future button
        const editFutureBtn = document.getElementById("editFutureBtn");
        if (editFutureBtn) {
            editFutureBtn.addEventListener("click", async () => {
                const editData = {
                    ...freshTask,
                    editMode: "future",
                    editDate: selectedDate,
                };
                localStorage.setItem("familyApp_editTask", JSON.stringify(editData));
                localStorage.setItem("familyApp_editTask_index", "0");

                const admin = localStorage.getItem("currentAdminEmail");
                const user = localStorage.getItem("currentUser");
                if (admin && user) {
                    window.location.href = `/BeeMazing-A1/mobile/3-Tasks/addtasks.html?admin=${encodeURIComponent(admin)}&user=${encodeURIComponent(user)}`;
                }
            });
        }

        // Edit Entire Task button
        const editTaskBtn = document.getElementById("editTaskBtn");
        if (editTaskBtn) {
            editTaskBtn.addEventListener("click", async () => {
                localStorage.setItem("familyApp_editTask", JSON.stringify(freshTask));
                localStorage.setItem("familyApp_editTask_index", "0");

                const admin = localStorage.getItem("currentAdminEmail");
                const user = localStorage.getItem("currentUser");
                if (admin && user) {
                    window.location.href = `/BeeMazing-A1/mobile/3-Tasks/addtasks.html?admin=${encodeURIComponent(admin)}&user=${encodeURIComponent(user)}`;
                }
            });
        }

        // Delete This Day button
        const deleteOccurrenceBtn = document.getElementById("deleteOccurrenceBtn");
        if (deleteOccurrenceBtn) {
            deleteOccurrenceBtn.addEventListener("click", async () => {
                if (confirm(`Are you sure you want to delete this task occurrence on ${selectedDate}? This will only affect this specific date.`)) {
                    try {
                        await deleteTaskFromBackend(freshTask.title, freshTask.date);
                        alert("Task occurrence deleted successfully!");
                        modal.remove();
                        style.remove();
                        location.reload();
                    } catch (error) {
                        console.error("Failed to delete task occurrence:", error);
                        alert("Failed to delete task occurrence. Please try again.");
                    }
                }
            });
        }

        // Delete Future button
        const deleteFutureBtn = document.getElementById("deleteFutureBtn");
        if (deleteFutureBtn) {
            deleteFutureBtn.addEventListener("click", async () => {
                const isOccurrenceTask = freshTask.originalTitle && freshTask.occurrence;
                const isOccurrenceByTitle = freshTask.title.includes(" - ") && /\d+(st|nd|rd|th)$/.test(freshTask.title);

                let titleToUse;
                let confirmMessage;

                if (isOccurrenceTask || isOccurrenceByTitle) {
                    titleToUse = freshTask.originalTitle || freshTask.title.split(" - ")[0];
                    confirmMessage = `Are you sure you want to delete ALL occurrences of "${titleToUse}" from ${selectedDate} forward?`;
                } else {
                    titleToUse = freshTask.title;
                    confirmMessage = `Are you sure you want to delete "${titleToUse}" from ${selectedDate} forward?`;
                }

                if (confirm(confirmMessage)) {
                    try {
                        // Implementation would depend on existing delete functions
                        alert("Future tasks deletion functionality needs to be implemented");
                        modal.remove();
                        style.remove();
                    } catch (error) {
                        console.error("Failed to delete future tasks:", error);
                        alert("Failed to delete future tasks. Please try again.");
                    }
                }
            });
        }

        // Delete Entire Task button
        const deleteEntireTaskBtn = document.getElementById("deleteEntireTaskBtn");
        if (deleteEntireTaskBtn) {
            deleteEntireTaskBtn.addEventListener("click", async () => {
                const isOccurrenceTask = freshTask.originalTitle && freshTask.occurrence;
                const isOccurrenceByTitle = freshTask.title.includes(" - ") && /\d+(st|nd|rd|th)$/.test(freshTask.title);

                let titleToUse;
                let confirmMessage;

                if (isOccurrenceTask || isOccurrenceByTitle) {
                    titleToUse = freshTask.originalTitle || freshTask.title.split(" - ")[0];
                    confirmMessage = `Are you sure you want to delete ALL occurrences of "${titleToUse}"?`;
                } else {
                    titleToUse = freshTask.title;
                    confirmMessage = `Are you sure you want to delete the entire "${titleToUse}" task?`;
                }

                if (confirm(confirmMessage)) {
                    try {
                        // Implementation would depend on existing delete functions
                        alert("Entire task deletion functionality needs to be implemented");
                        modal.remove();
                        style.remove();
                    } catch (error) {
                        console.error("Failed to delete entire task:", error);
                        alert("Failed to delete entire task. Please try again.");
                    }
                }
            });
        }
    }
}

// Master task details function for occurrence tasks
async function showMasterTaskDetails(originalTitle, selectedDate, currentTask) {
    // Fetch all tasks to find all occurrences of this task group
    const adminEmail = localStorage.getItem("currentAdminEmail");
