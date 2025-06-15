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

  // Universal task details styling and logic
  const userOrder =
    freshTask.users && Array.isArray(freshTask.users)
      ? [...freshTask.users]
      : [];

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
      for (const timeStr of freshTask.dueTimes) {
        const [hours, minutes] = timeStr.split(":").map(Number);
        const dueTime = hours * 60 + minutes;
        if (currentTime > dueTime) {
          isOverdue = true;
          break;
        }
      }
    } else {
      const hasCompletions =
        Array.isArray(freshTask.completions?.[selectedDate]) &&
        freshTask.completions[selectedDate].some((c) => !c.isPending);
      if (!hasCompletions && currentTime > 0) {
        isOverdue = true;
      }
    }
  } else if (selectedDate < currentDate) {
    const hasCompletions =
      Array.isArray(freshTask.completions?.[selectedDate]) &&
      freshTask.completions[selectedDate].some((c) => !c.isPending);
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

  // Status information (enhanced)
  const completedUsersForStatus = Array.isArray(
    freshTask.completions?.[selectedDate],
  )
    ? freshTask.completions[selectedDate]
    : [];
  const pendingUsersForStatus = completedUsersForStatus.filter(
    (c) => c.isPending,
  );
  const approvedUsersForStatus = completedUsersForStatus.filter(
    (c) => !c.isPending,
  );

  if (approvedUsersForStatus.length > 0) {
    const completedByUsers = [
      ...new Set(approvedUsersForStatus.map((c) => c.user)),
    ];
    const assignedUsers = freshTask.users || [];
    const isCompletedByDifferentUser = completedByUsers.some(
      (user) => !assignedUsers.includes(user),
    );

    if (
      isCompletedByDifferentUser ||
      completedByUsers.length !== assignedUsers.length
    ) {
      modalHTML += `<div class="task-info-row"><strong>Status:</strong> <span style="color: #28a745;">✅ Done by: ${completedByUsers.join(", ")}</span></div>`;
    } else {
      modalHTML += `<div class="task-info-row"><strong>Status:</strong> <span style="color: #28a745;">✅ Done</span></div>`;
    }
  } else if (pendingUsersForStatus.length > 0) {
    const pendingByUsers = [
      ...new Set(pendingUsersForStatus.map((c) => c.user)),
    ];
    modalHTML += `<div class="task-info-row"><strong>Status:</strong> <span style="color: #ff9800;">⏳ Pending approval (${pendingByUsers.join(", ")})</span></div>`;
  } else {
    modalHTML += `<div class="task-info-row"><strong>Status:</strong> <span style="color: #6c757d;">⭕ Incomplete</span></div>`;
  }

  // Original title info if exists
  if (freshTask.originalTitle && freshTask.originalTitle !== freshTask.title) {
    modalHTML += `<div class="task-info-row"><strong>Original Title:</strong> ${freshTask.originalTitle}</div>`;
  }

  // Occurrence info if exists
  if (freshTask.occurrence && freshTask.totalOccurrences > 1) {
    modalHTML += `<div class="task-info-row"><strong>Occurrence:</strong> ${freshTask.occurrence} of ${freshTask.totalOccurrences} daily occurrences</div>`;
  }

  // Notes if they exist
  if (freshTask.notes && freshTask.notes.trim()) {
    modalHTML += `<div class="task-info-row"><strong>Notes:</strong> ${freshTask.notes}</div>`;
  }

  // Frequency
  let frequencyText = freshTask.repeat || "Daily";
  if (freshTask.repeat === "Daily" && freshTask.timesPerDay) {
    frequencyText += ` - ${freshTask.timesPerDay} time(s)/day`;
  } else if (freshTask.repeat === "Weekly" && freshTask.timesPerWeek) {
    frequencyText += ` - ${freshTask.timesPerWeek} time(s)/week`;
  } else if (freshTask.repeat === "Monthly" && freshTask.timesPerMonth) {
    frequencyText += ` - ${freshTask.timesPerMonth} time(s)/month`;
  }
  modalHTML += `<div class="task-info-row"><strong>Frequency:</strong> ${frequencyText}</div>`;

  // Date range if it exists
  if (freshTask.date) {
    const [fromDate, toDate] = freshTask.date.split(" to ");
    if (fromDate) {
      let dateText = fromDate;
      if (toDate && toDate !== "3000-01-01" && toDate !== fromDate) {
        dateText += ` to ${toDate}`;
      }
      modalHTML += `<div class="task-info-row"><strong>Date Range:</strong> ${dateText}</div>`;
    }
  }

  // Room if it exists
  if (freshTask.room && freshTask.room.trim()) {
    modalHTML += `<div class="task-info-row"><strong>Room:</strong> ${freshTask.room}</div>`;
  }

  // Assigned users
  if (userOrder && userOrder.length > 0) {
    modalHTML += `<div class="task-info-row"><strong>Assigned to:</strong> ${userOrder.join(", ")}</div>`;
  }

  // Reward if it exists
  if (freshTask.reward && freshTask.reward !== "0") {
    modalHTML += `<div class="task-info-row"><strong>Reward:</strong> ${freshTask.reward} 🍯</div>`;
  }

  // Settings only if they differ from defaults
  let hasSettings = false;
  let settingsHtml = "";

  if (freshTask.parentApproval !== false) {
    settingsHtml += `<div class="task-info-row"><strong>Parent Approval:</strong> Required</div>`;
    hasSettings = true;
  }

  if (freshTask.onTimeCompletion) {
    settingsHtml += `<div class="task-info-row"><strong>On-time completion:</strong> Important</div>`;
    hasSettings = true;
  }

  if (hasSettings) {
    modalHTML += settingsHtml;
  }

  // Rotation/Individual/Team Work details
  let turnData = {
    turns: [],
    completedCount: 0,
    requiredTimes: 1,
  };

  if (freshTask.settings?.includes("Rotation")) {
    if (typeof mixedTurnData !== "function") {
      console.error(
        `mixedTurnData is not defined for task: ${freshTask.title}`,
      );
      modalHTML += `<em style="color:#ff4444;">Error: Rotation calculation unavailable. See console for details.</em><br>`;
    } else {
      try {
        turnData = mixedTurnData(freshTask, selectedDate);
        if (turnData.turns.length === 0) {
          modalHTML += `<em style="color:#ff4444;">Error: No rotation turns available. Check task configuration.</em><br>`;
        } else {
          const currentTurn =
            turnData.turns.find((t) => !t.isCompleted && !t.isPending)?.user ||
            "All done!";
          const nextTurnIndex =
            turnData.turns.findIndex((t) => !t.isCompleted && !t.isPending) + 1;
          const nextUser =
            nextTurnIndex < turnData.turns.length
              ? turnData.turns[nextTurnIndex]?.user
              : "—";
          const fairRotationText = freshTask.fairRotation
            ? freshTask.fairRotationTimeBased
              ? " (Fair Rotation - Time Based)"
              : " (Fair Rotation)"
            : "";
          modalHTML += `
                        <div style="margin: 15px 0; padding: 12px 0; border-top: 1px solid #FBB740;">
                            <div class="task-info-row"><strong>Settings:</strong> Rotation${fairRotationText}</div>
                            <div class="task-info-row"><strong>Current Turn:</strong> ${currentTurn}</div>
                            <div class="task-info-row"><strong>Next:</strong> ${nextUser}</div>
                            <div class="task-progress">Progress: ${turnData.completedCount}/${turnData.requiredTimes}</div>
                        </div>
                    `;
        }
      } catch (err) {
        console.error(
          `Error processing Rotation task "${freshTask.title}" on ${selectedDate}:`,
          err,
        );
        modalHTML += `<em style="color:#ff4444;">Error: Unable to calculate rotation (${err.message}). See console for details.</em><br>`;
      }
    }
  } else if (freshTask.settings?.includes("Individual")) {
    if (typeof individualTurnData !== "function") {
      console.error(
        `individualTurnData is not defined for task: ${freshTask.title}`,
      );
      modalHTML += `<em style="color:#ff4444;">Error: Progress calculation unavailable</em><br>`;
    } else {
      try {
        turnData = individualTurnData(freshTask, selectedDate);
        modalHTML += `
                    <div style="margin: 15px 0; padding: 12px 0; border-top: 1px solid #FBB740;">
                        <div class="task-info-row"><strong>Settings:</strong> Individual</div>
                    </div>
                `;
      } catch (individualError) {
        console.error(
          `Error processing Individual task "${freshTask.title}" on ${selectedDate}:`,
          individualError,
        );
        modalHTML += `<em>Error: Unable to calculate progress (${individualError.message}). See console for details.</em>`;
      }
    }
  } else if (freshTask.settings?.includes("Team Work")) {
    modalHTML += `
            <div style="margin: 15px 0; padding: 12px 0; border-top: 1px solid #FBB740;">
                <div class="task-info-row"><strong>Settings:</strong> Team Work</div>
            </div>
        `;
  }

  // Check if task can be completed - anyone can complete any task
  const currentUser = localStorage.getItem("currentUser");
  const currentUserEmail =
    localStorage.getItem("currentUserEmail") || adminEmail;
  const isParent = currentUserEmail === adminEmail;
  const canComplete =
    !freshTask.asNeeded && freshTask.users && freshTask.users.length > 0;
  const completedUsersForButton = Array.isArray(
    freshTask.completions?.[selectedDate],
  )
    ? freshTask.completions[selectedDate]
    : [];
  const pendingUsersForButton = completedUsersForButton.filter(
    (c) => c.isPending,
  );
  const approvedUsersForButton = completedUsersForButton.filter(
    (c) => !c.isPending,
  );
  const isTaskComplete =
    approvedUsersForButton.length > 0 || pendingUsersForButton.length > 0;

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
                <button id="deleteFutureBtn" style="padding: 8px 16px; background: #D32F2F; color: white; font-weight: 500; border-radius: 6px; border: none; cursor: pointer; font-size: 13px;">Delete Future</button>
                <button id="deleteEntireTaskBtn" style="padding: 8px 16px; background: #D32F2F; color: white; font-weight: 500; border-radius: 6px; border: none; cursor: pointer; font-size: 13px;">Delete Entire Task</button>
            </div>
        </div>
    `;

  const modal = document.createElement("div");
  modal.className = "task-modal";
  modal.innerHTML = `<div class="modal-content">${modalHTML}</div>`;
  document.body.appendChild(modal);

  modal.addEventListener("click", (e) => {
    if (e.target.classList.contains("task-modal")) modal.remove();
  });

  // Complete task button logic (preserved from original tasks.html)
  const completeBtn = modal.querySelector("#completeTaskBtn");
  if (completeBtn) {
    completeBtn.addEventListener("click", async () => {
      if (completeBtn.disabled) return;
      completeBtn.disabled = true;
      const originalText = completeBtn.innerHTML;
      completeBtn.innerHTML = "⏳ Processing...";

      try {
        // First, refresh task data to get latest completion status
        try {
          const response = await fetch(
            `https://beemazing1.onrender.com/api/tasks?adminEmail=${encodeURIComponent(adminEmail)}&t=${Date.now()}`,
            { cache: "no-store" },
          );
          if (response.ok) {
            const result = await response.json();
            const latestTask = result.tasks.find(
              (t) => t.title === task.title && t.date === task.date,
            );
            if (latestTask) {
              const latestCompletedUsers = Array.isArray(
                latestTask.completions?.[selectedDate],
              )
                ? latestTask.completions[selectedDate]
                : [];
              const latestApprovedUsers = latestCompletedUsers.filter(
                (c) => !c.isPending,
              );

              if (latestApprovedUsers.length > 0) {
                alert("This task has already been completed!");
                modal.remove();
                const selectedDateElement =
                  document.querySelector(".day.selected");
                const currentSelectedDate = selectedDateElement
                  ? selectedDateElement.dataset.date
                  : new Date().toISOString().split("T")[0];
                loadTasksForDate(currentSelectedDate);
                return;
              }
            }
          }
        } catch (error) {
          console.error("Error refreshing task data:", error);
        }

        const currentUser = localStorage.getItem("currentUser");
        const currentUserEmail =
          localStorage.getItem("currentUserEmail") || adminEmail;
        const isParent = currentUserEmail === adminEmail;

        if (isParent) {
          await showUserSelectionModal(freshTask, selectedDate, modal);
        } else {
          await completeTaskForUser(
            freshTask,
            selectedDate,
            currentUser,
            modal,
          );
        }
      } catch (error) {
        console.error("Error in task completion:", error);
        alert(`Failed to complete task: ${error.message}`);
      } finally {
        completeBtn.disabled = false;
        completeBtn.innerHTML = originalText;
      }
    });
  }

  // Get all family users
  async function getAllFamilyUsers() {
    try {
      const adminEmail = localStorage.getItem("currentAdminEmail");
      const response = await fetch(
        `https://beemazing1.onrender.com/api/users?adminEmail=${encodeURIComponent(adminEmail)}`,
      );
      if (response.ok) {
        const result = await response.json();
        return result.users || [];
      }
    } catch (error) {
      console.error("Error fetching family users:", error);
    }
    return [];
  }

  // User selection modal for task completion
  async function showUserSelectionModal(task, selectedDate, parentModal) {
    const userModal = document.createElement("div");
    userModal.className = "task-modal";
    userModal.style.zIndex = "1001";

    const allUsers = await getAllFamilyUsers();
    const usersToShow = allUsers.length > 0 ? allUsers : task.users;

    let userOptionsHtml = "";
    usersToShow.forEach((user) => {
      const isAssigned = task.users.includes(user);
      const buttonStyle = isAssigned
        ? "background: #FFF6E9; border: 2px solid #FBB740;"
        : "background: #f8f9fa; border: 2px solid #e4e3e0;";

      userOptionsHtml += `
                <button class="user-option-btn" data-user="${user}" style="
                    display: block;
                    width: 100%;
                    padding: 12px;
                    margin: 8px 0;
                    ${buttonStyle}
                    border-radius: 8px;
                    color: #5D4E41;
                    font-weight: 500;
                    cursor: pointer;
                    text-align: center;
                    transition: all 0.2s ease;
                " onmouseover="this.style.background='#FBB740'; this.style.color='white';" onmouseout="this.style.background='${isAssigned ? "#FFF6E9" : "#f8f9fa"}'; this.style.color='#5D4E41';">
                    ${user} ${isAssigned ? "(assigned)" : "(helped out)"}
                </button>
            `;
    });

    userModal.innerHTML = `
            <div class="modal-content">
                <h2>Who completed this task?</h2>
                <div style="margin: 15px 0; padding: 10px; background: #FFF6E9; border-radius: 6px; font-size: 13px; color: #5D4E41;">
                    💡 The buzz points will go to whoever you select
                </div>
                <div style="margin: 20px 0;">
                    ${userOptionsHtml}
                </div>
                <div style="text-align: center; margin-top: 20px;">
                    <button id="cancelUserSelection" style="padding: 8px 16px; background: #e4e3e0; color: #5D4E41; font-weight: 500; border-radius: 6px; border: none; cursor: pointer;">Cancel</button>
                </div>
            </div>
        `;

    document.body.appendChild(userModal);

    userModal.querySelectorAll(".user-option-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (btn.disabled) return;
        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = "Processing...";

        try {
          const selectedUser = btn.dataset.user;
          userModal.remove();
          await completeTaskForUser(
            task,
            selectedDate,
            selectedUser,
            parentModal,
          );
        } catch (error) {
          console.error("Error in user selection:", error);
          btn.disabled = false;
          btn.textContent = originalText;
          alert(`Failed to complete task: ${error.message}`);
        }
      });
    });

    document
      .getElementById("cancelUserSelection")
      .addEventListener("click", () => {
        userModal.remove();
      });

    userModal.addEventListener("click", (e) => {
      if (e.target.classList.contains("task-modal")) {
        userModal.remove();
      }
    });
  }

  // Complete task for specific user
  async function completeTaskForUser(task, selectedDate, userName, modal) {
    const adminEmail = localStorage.getItem("currentAdminEmail");

    try {
      const requestBody = {
        adminEmail: adminEmail,
        taskTitle: task.title,
        user: userName,
        date: selectedDate,
        parentApproval: task.parentApproval,
        taskUsers: task.users,
      };

      const response = await fetch(
        "https://beemazing1.onrender.com/api/complete-task",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: `HTTP error ${response.status}`,
        }));
        throw new Error(
          `Failed to complete task: ${errorData.error || response.statusText}`,
        );
      }

      const result = await response.json();
      console.log("✅ Task completed successfully:", result);

      modal.remove();

      if (typeof loadTasksForDate === "function") {
        setTimeout(() => {
          const selectedDateElement = document.querySelector(".day.selected");
          const currentSelectedDate = selectedDateElement
            ? selectedDateElement.dataset.date
            : new Date().toISOString().split("T")[0];
          loadTasksForDate(currentSelectedDate);
        }, 500);
      }
    } catch (error) {
      console.error("❌ Error completing task:", error);
      alert(`Failed to complete task: ${error.message}`);
    }
  }

  // Edit single occurrence (preserved from original tasks.html)
  const editOccurrenceBtn = modal.querySelector("#editOccurrenceBtn");
  if (editOccurrenceBtn) {
    editOccurrenceBtn.addEventListener("click", async () => {
      const isOccurrenceTask =
        freshTask.originalTitle && freshTask.totalOccurrences;
      const isOccurrenceByTitle =
        freshTask.title.includes(" - ") &&
        (freshTask.title.includes("1st") ||
          freshTask.title.includes("2nd") ||
          freshTask.title.includes("3rd"));

      let modifiedTask = { ...freshTask };

      if (
        freshTask.exceptions &&
        freshTask.exceptions[selectedDate] &&
        freshTask.exceptions[selectedDate].task
      ) {
        const exceptionTask = freshTask.exceptions[selectedDate].task;
        modifiedTask = {
          ...freshTask,
          ...exceptionTask,
          exceptions: freshTask.exceptions,
          completions: freshTask.completions,
        };
      }

      if (isOccurrenceTask || isOccurrenceByTitle) {
        const originalTitle =
          freshTask.originalTitle || freshTask.title.split(" - ")[0];
        const adminEmail = localStorage.getItem("currentAdminEmail");

        try {
          const response = await fetch(
            `https://beemazing1.onrender.com/api/tasks?adminEmail=${encodeURIComponent(adminEmail)}&t=${Date.now()}`,
            { cache: "no-store" },
          );
          if (response.ok) {
            const result = await response.json();
            const allOccurrences = result.tasks.filter(
              (t) =>
                (t.originalTitle === originalTitle ||
                  t.title.startsWith(originalTitle + " - ")) &&
                t.date === freshTask.date,
            );

            if (allOccurrences.length > 0) {
              allOccurrences.sort(
                (a, b) => (a.occurrence || 1) - (b.occurrence || 1),
              );

              modifiedTask = {
                ...allOccurrences[0],
                title: originalTitle,
                timesPerDay: allOccurrences.length,
                totalOccurrences: allOccurrences.length,
                users: [
                  ...new Set(allOccurrences.flatMap((occ) => occ.users || [])),
                ],
                dueTimes: allOccurrences
                  .map((occ) =>
                    occ.dueTimes && occ.dueTimes[0] ? occ.dueTimes[0] : "",
                  )
                  .filter((time) => time),
                occurrence: freshTask.occurrence,
                originalTitle: freshTask.originalTitle,
              };
            }
          }
        } catch (error) {
          console.error(
            "Error fetching occurrence data for occurrence edit:",
            error,
          );
        }
      }

      modifiedTask.isOccurrenceEdit = true;
      modifiedTask.targetDate = selectedDate;
      modifiedTask.originalStartDate = freshTask.date.split(" to ")[0];
      localStorage.setItem("familyApp_editTask", JSON.stringify(modifiedTask));
      localStorage.setItem(
        "familyApp_editTask_index",
        freshTask.title + "-" + freshTask.date + "-occurrence",
      );
      window.location.href = "/BeeMazing-A1/mobile/3-Tasks/addtasks.html";
    });
  }

  // Edit future occurrences (preserved from original tasks.html)
  const editFutureBtn = modal.querySelector("#editFutureBtn");
  if (editFutureBtn) {
    editFutureBtn.addEventListener("click", async () => {
      const isOccurrenceTask =
        freshTask.originalTitle && freshTask.totalOccurrences;
      const isOccurrenceByTitle =
        freshTask.title.includes(" - ") &&
        (freshTask.title.includes("1st") ||
          freshTask.title.includes("2nd") ||
          freshTask.title.includes("3rd"));

      let modifiedTask = { ...freshTask };

      if (
        freshTask.exceptions &&
        freshTask.exceptions[selectedDate] &&
        freshTask.exceptions[selectedDate].task
      ) {
        const exceptionTask = freshTask.exceptions[selectedDate].task;
        modifiedTask = {
          ...freshTask,
          ...exceptionTask,
          exceptions: freshTask.exceptions,
          completions: freshTask.completions,
        };
      }

      if (isOccurrenceTask || isOccurrenceByTitle) {
        const originalTitle =
          freshTask.originalTitle || freshTask.title.split(" - ")[0];
        const adminEmail = localStorage.getItem("currentAdminEmail");

        try {
          const response = await fetch(
            `https://beemazing1.onrender.com/api/tasks?adminEmail=${encodeURIComponent(adminEmail)}&t=${Date.now()}`,
            { cache: "no-store" },
          );
          if (response.ok) {
            const result = await response.json();
            const allOccurrences = result.tasks.filter(
              (t) =>
                (t.originalTitle === originalTitle ||
                  t.title.startsWith(originalTitle + " - ")) &&
                t.date === freshTask.date,
            );

            if (allOccurrences.length > 0) {
              allOccurrences.sort(
                (a, b) => (a.occurrence || 1) - (b.occurrence || 1),
              );

              modifiedTask = {
                ...allOccurrences[0],
                title: originalTitle,
                timesPerDay: allOccurrences.length,
                totalOccurrences: allOccurrences.length,
                users: [
                  ...new Set(allOccurrences.flatMap((occ) => occ.users || [])),
                ],
                dueTimes: allOccurrences
                  .map((occ) =>
                    occ.dueTimes && occ.dueTimes[0] ? occ.dueTimes[0] : "",
                  )
                  .filter((time) => time),
                occurrence: undefined,
                originalTitle: undefined,
              };
            }
          }
        } catch (error) {
          console.error(
            "Error fetching occurrence data for future edit:",
            error,
          );
        }

        modifiedTask.isFutureEdit = true;
        modifiedTask.isOccurrenceGroupEdit = true;
        modifiedTask.splitDate = selectedDate;
        modifiedTask.originalStartDate = freshTask.date.split(" to ")[0];
        modifiedTask.originalTitle = originalTitle;
        modifiedTask.totalOccurrences =
          modifiedTask.totalOccurrences || freshTask.totalOccurrences || 3;

        localStorage.setItem(
          "familyApp_editTask",
          JSON.stringify(modifiedTask),
        );
        localStorage.setItem(
          "familyApp_editTask_index",
          originalTitle + "-" + freshTask.date + "-future-group",
        );
      } else {
        modifiedTask.isFutureEdit = true;
        modifiedTask.splitDate = selectedDate;
        modifiedTask.originalStartDate = freshTask.date.split(" to ")[0];
        localStorage.setItem(
          "familyApp_editTask",
          JSON.stringify(modifiedTask),
        );
        localStorage.setItem(
          "familyApp_editTask_index",
          freshTask.title + "-" + freshTask.date + "-future",
        );
      }

      window.location.href = "/BeeMazing-A1/mobile/3-Tasks/addtasks.html";
    });
  }

  // Edit entire task (preserved from original tasks.html)
  const editTaskBtn = modal.querySelector("#editTaskBtn");
  if (editTaskBtn) {
    editTaskBtn.addEventListener("click", async () => {
      const isOccurrenceTask =
        freshTask.originalTitle && freshTask.totalOccurrences;
      const isOccurrenceByTitle =
        freshTask.title.includes(" - ") &&
        (freshTask.title.includes("1st") ||
          freshTask.title.includes("2nd") ||
          freshTask.title.includes("3rd"));

      let taskDataToEdit = { ...freshTask };

      if (
        freshTask.exceptions &&
        freshTask.exceptions[selectedDate] &&
        freshTask.exceptions[selectedDate].task
      ) {
        const exceptionTask = freshTask.exceptions[selectedDate].task;
        taskDataToEdit = {
          ...freshTask,
          ...exceptionTask,
          exceptions: freshTask.exceptions,
          completions: freshTask.completions,
        };
      }

      if (isOccurrenceTask || isOccurrenceByTitle) {
        const originalTitle =
          freshTask.originalTitle || freshTask.title.split(" - ")[0];
        const adminEmail = localStorage.getItem("currentAdminEmail");

        try {
          await new Promise((resolve) => setTimeout(resolve, 3000));

          let response;
          let attempts = 0;
          const maxAttempts = 3;

          while (attempts < maxAttempts) {
            attempts++;
            const cacheBuster = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_attempt${attempts}`;

            response = await fetch(
              `https://beemazing1.onrender.com/api/tasks?adminEmail=${encodeURIComponent(adminEmail)}&t=${cacheBuster}&refresh=true&force=true`,
              {
                cache: "no-store",
                headers: {
                  "Cache-Control": "no-cache, no-store, must-revalidate",
                  Pragma: "no-cache",
                  Expires: "0",
                  "X-Force-Refresh": "true",
                },
              },
            );

            if (response.ok) {
              break;
            }

            if (attempts < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }

          if (response.ok) {
            const result = await response.json();
            const allOccurrences = result.tasks.filter(
              (t) =>
                (t.originalTitle === originalTitle ||
                  t.title.startsWith(originalTitle + " - ")) &&
                t.date === freshTask.date,
            );

            if (allOccurrences.length > 0) {
              allOccurrences.sort(
                (a, b) => (a.occurrence || 1) - (b.occurrence || 1),
              );

              taskDataToEdit = {
                ...allOccurrences[0],
                title: originalTitle,
                timesPerDay: allOccurrences.length,
                totalOccurrences: allOccurrences.length,
                users: [
                  ...new Set(allOccurrences.flatMap((occ) => occ.users || [])),
                ],
                dueTimes: allOccurrences
                  .map((occ) =>
                    occ.dueTimes && occ.dueTimes[0] ? occ.dueTimes[0] : "",
                  )
                  .filter((time) => time),
                originalTitle: originalTitle,
                isOccurrenceGroupEdit: true,
                occurrence: undefined,
              };
            }
          }
        } catch (error) {
          console.error("Error fetching occurrence data:", error);
        }
      }

      localStorage.setItem(
        "familyApp_editTask",
        JSON.stringify(taskDataToEdit),
      );
      localStorage.setItem(
        "familyApp_editTask_index",
        taskDataToEdit.title + "-" + freshTask.date + "-entire",
      );

      const admin = localStorage.getItem("currentAdminEmail");
      const user = localStorage.getItem("currentUser");

      if (admin && user) {
        const targetUrl = `/BeeMazing-A1/mobile/3-Tasks/addtasks.html?admin=${encodeURIComponent(admin)}&user=${encodeURIComponent(user)}`;
        window.location.href = targetUrl;
      } else {
        alert("Admin or user information missing. Please log in again.");
      }
    });
  }

  // Delete single occurrence (preserved from original tasks.html)
  const deleteOccurrenceBtn = modal.querySelector("#deleteOccurrenceBtn");
  if (deleteOccurrenceBtn) {
    deleteOccurrenceBtn.addEventListener("click", async () => {
      if (deleteOccurrenceBtn.disabled) return;
      deleteOccurrenceBtn.disabled = true;
      const originalText = deleteOccurrenceBtn.textContent;
      deleteOccurrenceBtn.textContent = "Deleting...";

      try {
        if (
          confirm(
            `Are you sure you want to delete this task occurrence on ${selectedDate}? This will only affect this specific date.`,
          )
        ) {
          modal.remove();
          await deleteSingleOccurrence(
            freshTask.title,
            selectedDate,
            freshTask.date.split(" to ")[0],
          );
          loadTasksForDate(selectedDate);
        }
      } finally {
        deleteOccurrenceBtn.disabled = false;
        deleteOccurrenceBtn.textContent = originalText;
      }
    });
  }

  // Delete future occurrences (preserved from original tasks.html)
  const deleteFutureBtn = modal.querySelector("#deleteFutureBtn");
  if (deleteFutureBtn) {
    deleteFutureBtn.addEventListener("click", async () => {
      if (deleteFutureBtn.disabled) return;
      deleteFutureBtn.disabled = true;
      const originalText = deleteFutureBtn.textContent;
      deleteFutureBtn.textContent = "Deleting...";

      try {
        const isOccurrenceTask =
          freshTask.originalTitle && freshTask.totalOccurrences;
        const isOccurrenceByTitle =
          freshTask.title.includes(" - ") &&
          (freshTask.title.includes("1st") ||
            freshTask.title.includes("2nd") ||
            freshTask.title.includes("3rd"));

        let titleToUse;
        let confirmMessage;

        if (isOccurrenceTask || isOccurrenceByTitle) {
          titleToUse =
            freshTask.originalTitle || freshTask.title.split(" - ")[0];
          confirmMessage = `Are you sure you want to delete ALL occurrences of "${titleToUse}" from ${selectedDate} forward?\n\nThis will delete all daily occurrences (1st, 2nd, 3rd, etc.) from today and all future dates.`;
        } else {
          titleToUse = freshTask.title;
          confirmMessage = `Are you sure you want to delete "${titleToUse}" from ${selectedDate} forward?\n\nThis will affect all future occurrences.`;
        }

        if (confirm(confirmMessage)) {
          modal.remove();

          if (isOccurrenceTask || isOccurrenceByTitle) {
            await deleteAllOccurrencesFuture(titleToUse, selectedDate);
          } else {
            await deleteFutureOccurrences(
              titleToUse,
              selectedDate,
              freshTask.date.split(" to ")[0],
            );
          }

          loadTasksForDate(selectedDate);
        }
      } finally {
        deleteFutureBtn.disabled = false;
        deleteFutureBtn.textContent = originalText;
      }
    });
  }

  // Delete entire task (preserved from original tasks.html)
  const deleteEntireTaskBtn = modal.querySelector("#deleteEntireTaskBtn");
  if (deleteEntireTaskBtn) {
    deleteEntireTaskBtn.addEventListener("click", async () => {
      if (deleteEntireTaskBtn.disabled) return;
      deleteEntireTaskBtn.disabled = true;
      const originalText = deleteEntireTaskBtn.textContent;
      deleteEntireTaskBtn.textContent = "Deleting...";

      try {
        const isOccurrenceTask =
          freshTask.originalTitle && freshTask.totalOccurrences;
        const isOccurrenceByTitle =
          freshTask.title.includes(" - ") &&
          (freshTask.title.includes("1st") ||
            freshTask.title.includes("2nd") ||
            freshTask.title.includes("3rd"));

        let titleToUse;
        let confirmMessage;

        if (isOccurrenceTask || isOccurrenceByTitle) {
          titleToUse =
            freshTask.originalTitle || freshTask.title.split(" - ")[0];
          confirmMessage = `Are you sure you want to delete ALL occurrences of "${titleToUse}"?\n\nThis will delete all daily occurrences (1st, 2nd, 3rd, etc.) across all past and future dates.`;
        } else {
          titleToUse = freshTask.title;
          confirmMessage = `Are you sure you want to delete "${titleToUse}"?\n\nThis will delete the entire task and affect all past and future occurrences.`;
        }

        if (confirm(confirmMessage)) {
          modal.remove();

          if (isOccurrenceTask || isOccurrenceByTitle) {
            await deleteAllOccurrences(titleToUse, freshTask.date);
          } else {
            await deleteTaskFromBackend(titleToUse, freshTask.date);
          }

          loadTasksForDate(selectedDate);
        }
      } finally {
        deleteEntireTaskBtn.disabled = false;
        deleteEntireTaskBtn.textContent = originalText;
      }
    });
  }
}
