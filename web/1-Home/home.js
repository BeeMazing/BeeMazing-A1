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
          
            // ✅ Now call renderUsers() only after permissions are updated
            renderUsers(allUserData[email].users, allUserData[email].permissions);
          }
        } catch (err) {
          console.error("❌ Failed to fetch user list from server:", err);
        }
      }
      
      
      fetchUsersFromServer(currentAdmin); // 🔥 Call it
      



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
    function renderUsers(usersFromServer, permissionsFromServer) {
      const userDropdown = document.getElementById("userDropdown");
      const noUsersMessage = document.getElementById("noUsersMessage");
      const users = usersFromServer || [];
      const userPermissions = permissionsFromServer || {};
      const isMobile = window.location.pathname.includes("/BeeMazing-Y1/mobile/");
      const basePath = isMobile ? "/BeeMazing-Y1/mobile" : "/web";
      const currentAdmin = localStorage.getItem("currentAdminEmail");
  
      // Clear existing options except the default
      userDropdown.innerHTML = '<option value="" disabled selected>Select User</option>';
  
      // Show/hide no users message
      if (users.length === 0) {
          noUsersMessage.style.display = "block";
          userDropdown.style.display = "none";
      } else {
          noUsersMessage.style.display = "none";
          userDropdown.style.display = "block";
  
          // Populate dropdown
          users.forEach((username) => {
              const option = document.createElement("option");
              option.value = username;
              option.textContent = userPermissions[username] === "Admin" ? `${username} (Admin)` : username;
              userDropdown.appendChild(option);
          });
      }
  
      // Handle selection
      userDropdown.addEventListener("change", function () {
          const selectedUser = userDropdown.value;
          if (selectedUser) {
              const page = userPermissions[selectedUser] === "Admin" ? "userAdmin.html" : "users.html";
              window.location.href = `${basePath}/2-UserProfiles/${page}?admin=${encodeURIComponent(currentAdmin)}&user=${encodeURIComponent(selectedUser)}`;
              // Reset dropdown to default
              userDropdown.value = "";
          }
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





logoutBtn.addEventListener("click", () => {
    // Only remove login session info
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("userData");
    localStorage.removeItem("adminPassword"); // optional, if stored

    // Keep currentAdminEmail so login.html still knows the registered account
    window.location.href = "/BeeMazing-Y1/login.html";
});





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


savePermissionBtn.addEventListener("click", async () => {
    const allUserData = JSON.parse(localStorage.getItem("userData")) || {};
    if (!allUserData[currentAdmin].permissions) {
      allUserData[currentAdmin].permissions = {};
    }
  
    if (selectedUserForPermission) {
      allUserData[currentAdmin].permissions[selectedUserForPermission] = permissionSelect.value;
      localStorage.setItem("userData", JSON.stringify(allUserData));
  
      // 🔥 Save to server
      try {
        const res = await fetch("https://beemazing.onrender.com/save-permissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            adminEmail: currentAdmin,
            permissions: allUserData[currentAdmin].permissions
          })
        });
        const result = await res.json();
        if (!result.success) {
          console.warn("❌ Failed to save permissions to cloud");
        }
      } catch (err) {
        console.error("Error saving permissions to server:", err);
      }
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