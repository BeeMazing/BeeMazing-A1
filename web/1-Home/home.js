document.addEventListener("DOMContentLoaded", function () {

    const urlParams = new URLSearchParams(window.location.search);
const adminFromURL = urlParams.get("admin");
if (adminFromURL) {
    localStorage.setItem("currentAdminEmail", adminFromURL);
}


    // Redirect to login if user not logged in
    if (localStorage.getItem("isAdmin") === null) {
        window.location.href = "/BeeMazing-Y1/login.html";
        return;
    }

    // Determine if this user is admin
    const isAdmin = localStorage.getItem("isAdmin") === "true";

    const footer = document.getElementById("footer");
if (!isAdmin && footer) {
    footer.style.display = "none";
}


    const addUserBtn = document.getElementById("addUserBtn");
    if (!isAdmin && addUserBtn) {
        addUserBtn.style.display = "none";
    }

    const addUserModal = document.getElementById("addUserModal");
    const submitUserBtn = document.getElementById("submitUserBtn");
    if (!isAdmin && submitUserBtn) {
        submitUserBtn.disabled = true;
    }

    const usernameInput = document.getElementById("usernameInput");
    const userList = document.getElementById("userList");
    const manageMembersBtn = document.getElementById("manageMembersBtn");
    const manageMembersModal = document.getElementById("manageMembersModal");
    const manageMembersList = document.getElementById("manageMembersList");

    // Determine the base path (mobile or web) based on the current URL
    const isMobile = window.location.pathname.includes("/BeeMazing-Y1/mobile/");
    const basePath = isMobile ? "/BeeMazing-Y1/mobile" : "/web";

    // Load users from localStorage on page load
    const currentAdmin = localStorage.getItem("currentAdminEmail");

    async function fetchUsersFromServer(email) {
        try {
          const res = await fetch(`https://beemazing.onrender.com/get-users?adminEmail=${encodeURIComponent(email)}`);
          const data = await res.json();
      
          if (data.success) {
            const allUserData = JSON.parse(localStorage.getItem("userData")) || {};
            if (!allUserData[email]) {
              allUserData[email] = { users: [], permissions: {} };
            }
      
            allUserData[email].users = data.users || [];
            allUserData[email].permissions = data.permissions || {};
      
            localStorage.setItem("userData", JSON.stringify(allUserData));
            renderUsers(); // Refresh UI
          }
        } catch (err) {
          console.error("❌ Failed to fetch user list from server:", err);
        }
      }
      
      
      fetchUsersFromServer(currentAdmin); // 🔥 Call it
      

    renderUsers();

    // Show the modal with a smooth animation when "Add Members" button is clicked
    if (addUserBtn) {
        addUserBtn.addEventListener("click", function () {
            if (isAdmin) {
                addUserModal.classList.add("show");
            }
        });
    }


    // Add user when "Add" button is clicked
    if (submitUserBtn) {
        submitUserBtn.addEventListener("click", async function () {
            const username = usernameInput.value.trim();
            const errorMessage = document.getElementById("errorMessage");

            if (username) {
                try {
                    const res = await fetch("https://beemazing.onrender.com/add-user", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ adminEmail: currentAdmin, newUser: username })
                    });
            
                    const result = await res.json();
                    if (result.success) {
                        usernameInput.value = "";
                        addUserModal.classList.remove("show");
                        errorMessage.style.display = "none";
            
                        // Reload from server to sync
                        fetchUsersFromServer(currentAdmin);
            
                        if (manageMembersModal && manageMembersModal.classList.contains("show")) {
                            renderManageMembers();
                        }
            
                        const encodedAdmin = encodeURIComponent(currentAdmin);
                        const encodedUser = encodeURIComponent(username);
                        const inviteLink = `${window.location.origin}/BeeMazing-Y1/mobile/2-UserProfiles/users.html?admin=${encodedAdmin}&user=${encodedUser}`;
                        alert(`Send this link to the user: ${inviteLink}`);
                    } else {
                        errorMessage.textContent = "Failed to add user.";
                        errorMessage.style.display = "block";
                    }
                } catch (err) {
                    console.error("Failed to add user:", err);
                    errorMessage.textContent = "Server error. Please try again.";
                    errorMessage.style.display = "block";
                }
            } else {
                errorMessage.textContent = "Please enter a valid user name.";
                errorMessage.style.display = "block";
            }
            

            const encodedAdmin = encodeURIComponent(currentAdmin);
const encodedUser = encodeURIComponent(username);
const inviteLink = `${window.location.origin}/BeeMazing-Y1/mobile/2-UserProfiles/users.html?admin=${encodedAdmin}&user=${encodedUser}`;
alert(`Send this link to the user: ${inviteLink}`);

        });
    }

    // Close modal when clicking outside the modal content
    if (addUserModal) {
        addUserModal.addEventListener("click", function (e) {
            if (e.target === addUserModal) {
                addUserModal.classList.remove("show");
            }
        });
    }

    // Close manage members modal when clicking outside
    if (manageMembersModal) {
        manageMembersModal.addEventListener("click", function (e) {
            if (e.target === manageMembersModal) {
                manageMembersModal.classList.remove("show");
            }
        });
    }

    // Show the manage members modal when "Manage Members" button is clicked
    if (manageMembersBtn) {
        manageMembersBtn.addEventListener("click", function () {
            renderManageMembers();
            manageMembersModal.classList.add("show");
        });
    }

    // Function to render users in the main list
    function renderUsers() {
        const isAdmin = localStorage.getItem("isAdmin") === "true";
        const allUserData = JSON.parse(localStorage.getItem("userData")) || {};
        const users = allUserData[currentAdmin]?.users || [];
        const userPermissions = allUserData[currentAdmin]?.permissions || {};        
        userList.innerHTML = "";
        users.forEach((username) => {
            const newUserItem = document.createElement("li");
            newUserItem.classList.add("user-list-item");
    
            // Container for username and checkmark
            const nameContainer = document.createElement("div");
            nameContainer.style.display = "flex";
            nameContainer.style.alignItems = "center";
            nameContainer.style.gap = "8px";
    
            // Add user name
            const userNameSpan = document.createElement("span");
            userNameSpan.textContent = username;
    
            // Add checkmark if user is an admin
            if (userPermissions[username] === "Admin") {
                const checkmark = document.createElement("span");
                checkmark.textContent = "✓";
                checkmark.style.color = "#00C4B4"; // A nice teal color, you can change this
                checkmark.style.fontSize = "16px";
                checkmark.style.fontWeight = "bold";
                checkmark.title = "Admin";
                nameContainer.appendChild(userNameSpan);
                nameContainer.appendChild(checkmark);
            } else {
                nameContainer.appendChild(userNameSpan);
            }
    
            // Make the entire user item clickable
            newUserItem.style.cursor = "pointer";
            newUserItem.addEventListener("click", function () {
                window.location.href = `${basePath}/2-UserProfiles/users.html?user=${encodeURIComponent(username)}`;
            });
    
            // Append name container
            newUserItem.appendChild(nameContainer);
    
            // Show remove and edit buttons only for mobile AND admin
            if (isMobile && isAdmin) {
                const actionsContainer = document.createElement("div");
                actionsContainer.style.display = "flex";
                actionsContainer.style.gap = "8px";
    
                // Remove button
                const removeBtn = document.createElement("button");
                removeBtn.classList.add("remove-user-btn");
                removeBtn.textContent = "X";
                removeBtn.addEventListener("click", function (event) {
                    event.stopPropagation();
                    showConfirmModal(username);
                });
    
                // Edit button
                const editBtn = document.createElement("button");
                editBtn.classList.add("remove-user-btn"); // reusing style
                editBtn.innerHTML = "⚙️";
                editBtn.style.fontSize = "16px";
                editBtn.addEventListener("click", function (event) {
                    event.stopPropagation();
                    showPermissionModal(username);
                });
    
                actionsContainer.appendChild(editBtn);
                actionsContainer.appendChild(removeBtn);
                newUserItem.appendChild(actionsContainer);
            }
    
            userList.appendChild(newUserItem);
        });
    }
    

    // Function to render users in the manage members modal
    function renderManageMembers() {
        if (!manageMembersList) return; // Skip if not in web version
    
        manageMembersList.innerHTML = "";
        const updatedUserData = JSON.parse(localStorage.getItem("userData")) || {};
        const updatedUsers = updatedUserData[currentAdmin]?.users || [];
    
        updatedUsers.forEach((username, index) => {
            const manageItem = document.createElement("li");
            manageItem.classList.add("manage-members-item");
    
            // Input field for editing the username
            const input = document.createElement("input");
            input.type = "text";
            input.value = username;
            input.addEventListener("change", async function () {
                const newName = input.value.trim();
                if (newName !== "") {
                    updatedUsers[index] = newName;
                    updatedUserData[currentAdmin].users = updatedUsers;
                    localStorage.setItem("userData", JSON.stringify(updatedUserData));
                    renderUsers();
                    renderManageMembers();
                } else {
                    // If the input is empty, treat it as a deletion
                    await deleteUserFromServer(username);
                }
            });
    
            // Delete button
            const deleteBtn = document.createElement("button");
            deleteBtn.classList.add("delete-btn");
            deleteBtn.textContent = "Delete";
            deleteBtn.addEventListener("click", async function () {
                await deleteUserFromServer(username);
            });
    
            manageItem.appendChild(input);
            manageItem.appendChild(deleteBtn);
            manageMembersList.appendChild(manageItem);
        });
    
        // Show a message if no users exist
        if (updatedUsers.length === 0) {
            manageMembersList.innerHTML = "<p>No members to manage.</p>";
        }
    }
    
// Helper function to delete a user from the server
async function deleteUserFromServer(username) {
    try {
        const res = await fetch(
            `https://beemazing.onrender.com/delete-user?adminEmail=${encodeURIComponent(currentAdmin)}&username=${encodeURIComponent(username)}`,
            {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
            }
        );

        const result = await res.json();
        if (result.success) {
            // Update localStorage after successful server deletion
            const allUserData = JSON.parse(localStorage.getItem("userData")) || {};
            let users = allUserData[currentAdmin]?.users || [];
            users = users.filter(user => user !== username);
            allUserData[currentAdmin].users = users;
            localStorage.setItem("userData", JSON.stringify(allUserData));

            renderUsers();
            renderManageMembers();
        } else {
            alert("Failed to delete user from server: " + result.message);
        }
    } catch (err) {
        console.error("Failed to delete user:", err);
        alert("Error deleting user. Please try again.");
    }
}








    let userToRemove = null;

function showConfirmModal(username) {
    userToRemove = username;
    document.getElementById("confirmModal").classList.add("show");
}

document.getElementById("confirmYesBtn").addEventListener("click", async () => {
    if (userToRemove) {
      try {
        // Call the server to delete the user
        const res = await fetch(
          `https://beemazing.onrender.com/delete-user?adminEmail=${encodeURIComponent(currentAdmin)}&username=${encodeURIComponent(userToRemove)}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          }
        );
  
        const result = await res.json();
        if (result.success) {
          // Update localStorage after successful server deletion
          const allUserData = JSON.parse(localStorage.getItem("userData")) || {};
          let users = allUserData[currentAdmin]?.users || [];
          users = users.filter(user => user !== userToRemove);
          allUserData[currentAdmin].users = users;
          localStorage.setItem("userData", JSON.stringify(allUserData));
  
          userToRemove = null;
          document.getElementById("confirmModal").classList.remove("show");
          location.reload(); // Reload to re-render the user list
        } else {
          alert("Failed to delete user from server: " + result.message);
        }
      } catch (err) {
        console.error("Failed to delete user:", err);
        alert("Error deleting user. Please try again.");
      }
    }
  });

document.getElementById("confirmNoBtn").addEventListener("click", () => {
    userToRemove = null;
    document.getElementById("confirmModal").classList.remove("show");
});





const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("isAdmin");
        window.location.href = "/BeeMazing-Y1/login.html";
    });
}



const permissionModal = document.getElementById("permissionModal");
const permissionModalUser = document.getElementById("permissionModalUser");
const permissionSelect = document.getElementById("permissionSelect");
const savePermissionBtn = document.getElementById("savePermissionBtn");

let selectedUserForPermission = null;

function showPermissionModal(username) {
    selectedUserForPermission = username;
    permissionModalUser.textContent = `Permissions for ${username}`;

    const allUserData = JSON.parse(localStorage.getItem("userData")) || {}; // ✅ NOW it's fresh
    const userPermissions = allUserData[currentAdmin]?.permissions || {};
    permissionSelect.value = userPermissions[username] || "User";

    permissionModal.classList.add("show");
}


savePermissionBtn.addEventListener("click", () => {
    const allUserData = JSON.parse(localStorage.getItem("userData")) || {};
    if (!allUserData[currentAdmin].permissions) {
      allUserData[currentAdmin].permissions = {};
    }
    if (selectedUserForPermission) {
      allUserData[currentAdmin].permissions[selectedUserForPermission] = permissionSelect.value;
      localStorage.setItem("userData", JSON.stringify(allUserData));
    }
    permissionModal.classList.remove("show");
  });
  

permissionModal.addEventListener("click", (e) => {
    if (e.target === permissionModal) {
        permissionModal.classList.remove("show");
    }
});




// Show change password button only for logged in admins
const changePasswordBtn = document.getElementById("changePasswordBtn");
if (isAdmin && changePasswordBtn) {
  changePasswordBtn.style.display = "inline-block";

  changePasswordBtn.addEventListener("click", () => {
    document.getElementById("changePasswordModal").classList.add("show");
    document.getElementById("newAdminPassword").value = "";
    document.getElementById("newAdminPassword").focus();
  });
}

// Confirm new password
const confirmChangePasswordBtn = document.getElementById("confirmChangePasswordBtn");
confirmChangePasswordBtn.addEventListener("click", () => {
  const newPassword = document.getElementById("newAdminPassword").value.trim();
  if (newPassword.length < 4) {
    alert("Password must be at least 4 characters.");
    return;
  }
  localStorage.setItem("adminPassword", newPassword);
  alert("Admin password updated!");
  document.getElementById("changePasswordModal").classList.remove("show");
});

// Close modal on outside click
document.getElementById("changePasswordModal").addEventListener("click", (e) => {
  if (e.target.id === "changePasswordModal") {
    document.getElementById("changePasswordModal").classList.remove("show");
  }
});



});
