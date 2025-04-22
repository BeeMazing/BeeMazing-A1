document.addEventListener("DOMContentLoaded", function () {


  let currentPermissions = {};

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
              currentPermissions = { ...allUserData[email].permissions }; // Update global permissions
              renderUsers(allUserData[email].users, allUserData[email].permissions);
          }
      } catch (err) {
          console.error("Failed to fetch user list from server:", err);
      }
  }      
      
      fetchUsersFromServer(currentAdmin); // 🔥 Call it
      
      const userManagementBtn = document.getElementById("userManagementBtn");
      const userManagementModal = document.getElementById("userManagementModal");
      if (isAdmin && userManagementBtn) {
          userManagementBtn.style.display = "block";
          userManagementBtn.addEventListener("click", function () {
              renderUserManagement();
              userManagementModal.classList.add("show");
          });
      }


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





    // Function to render users in the main list
    function renderUsers(usersFromServer, permissionsFromServer) {
      const userDropdown = document.getElementById("userDropdown");
      const noUsersMessage = document.getElementById("noUsersMessage");
      const users = usersFromServer || [];
      const isMobile = window.location.pathname.includes("/BeeMazing-Y1/mobile/");
      const basePath = isMobile ? "/BeeMazing-Y1/mobile" : "/web";
      const currentAdmin = localStorage.getItem("currentAdminEmail");
  
      console.log("Rendering users with permissions:", currentPermissions);
  
      userDropdown.innerHTML = '<option value="" disabled selected>Select User</option>';
  
      if (users.length === 0) {
          noUsersMessage.style.display = "block";
          userDropdown.style.display = "none";
      } else {
          noUsersMessage.style.display = "none";
          userDropdown.style.display = "block";
  
          users.forEach((username) => {
              const option = document.createElement("option");
              option.value = username;
              option.textContent = currentPermissions[username] === "Admin" ? `${username} ✓` : username;
              if (currentPermissions[username] === "Admin") {
                  option.classList.add("admin-checkmark");
              }
              userDropdown.appendChild(option);
          });
      }
  
      const newDropdown = userDropdown.cloneNode(true);
      userDropdown.parentNode.replaceChild(newDropdown, userDropdown);
  
      newDropdown.addEventListener("change", function () {
          const selectedUser = newDropdown.value;
          if (selectedUser) {
              console.log(`Selected user: ${selectedUser}, Permission: ${currentPermissions[selectedUser]}`);
              const page = currentPermissions[selectedUser] === "Admin" ? "userAdmin.html" : "users.html";
              window.location.href = `${basePath}/2-UserProfiles/${page}?admin=${encodeURIComponent(currentAdmin)}&user=${encodeURIComponent(selectedUser)}`;
              newDropdown.value = "";
          }
      });
  }




    function renderUserManagement() {
      const userManagementList = document.getElementById("userManagementList");
      if (!userManagementList) return;
  
      userManagementList.innerHTML = "";
      const allUserData = JSON.parse(localStorage.getItem("userData")) || {};
      const users = allUserData[currentAdmin]?.users || [];
  
      users.forEach((username) => {
          const manageItem = document.createElement("li");
          manageItem.classList.add("manage-members-item");
  
          const label = document.createElement("span");
          label.textContent = username;
  
          const select = document.createElement("select");
          select.innerHTML = `
              <option value="User">User</option>
              <option value="Admin">Admin</option>
          `;
          select.value = currentPermissions[username] || "User";
          select.addEventListener("change", async () => {
              allUserData[currentAdmin].permissions[username] = select.value;
              currentPermissions[username] = select.value;
              localStorage.setItem("userData", JSON.stringify(allUserData));
  
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
                      console.warn("Failed to save permissions to cloud");
                  }
                  renderUsers(allUserData[currentAdmin].users, allUserData[currentAdmin].permissions);
              } catch (err) {
                  console.error("Error saving permissions to server:", err);
                  alert("Failed to save permissions. Please try again.");
              }
          });
  
          const deleteBtn = document.createElement("button");
          deleteBtn.classList.add("delete-btn");
          deleteBtn.textContent = "Delete";
          deleteBtn.addEventListener("click", () => {
            userManagementModal.classList.remove("show");
            showConfirmModal(username);
        });
  
          manageItem.appendChild(label);
          manageItem.appendChild(select);
          manageItem.appendChild(deleteBtn);
          userManagementList.appendChild(manageItem);
      });
  
      if (users.length === 0) {
          userManagementList.innerHTML = "<p>No users to manage.</p>";
      }
  
      userManagementModal.addEventListener("click", function (e) {
          if (e.target === userManagementModal) {
              userManagementModal.classList.remove("show");
          }
      }, { once: true });
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
          const allUserData = JSON.parse(localStorage.getItem("userData")) || {};
          let users = allUserData[currentAdmin]?.users || [];
          users = users.filter(user => user !== username);
          allUserData[currentAdmin].users = users;
          delete allUserData[currentAdmin].permissions[username]; // Remove permissions
          delete currentPermissions[username]; // Update global permissions
          localStorage.setItem("userData", JSON.stringify(allUserData));
          renderUsers(allUserData[currentAdmin].users, allUserData[currentAdmin].permissions);
          renderUserManagement();
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
      await deleteUserFromServer(userToRemove);
      userToRemove = null;
      document.getElementById("confirmModal").classList.remove("show");
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