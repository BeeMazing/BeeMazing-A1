document.addEventListener("DOMContentLoaded", function () {

  const urlParams = new URLSearchParams(window.location.search);
const adminFromURL = urlParams.get("admin");
if (adminFromURL) {
  localStorage.setItem("currentAdminEmail", adminFromURL);
}

const currentAdmin = localStorage.getItem("currentAdminEmail");

  // Redirect to login if user not logged in
  if (localStorage.getItem("isAdmin") === null) {
      window.location.href = "/BeeMazing-Y1/login.html";
      return;
  }

  // Determine if this user is admin
  const isAdmin = localStorage.getItem("isAdmin") === "true";




 // ✅ FIRST: get DOM elements
 const footer = document.getElementById("footer");
 const addUserBtn = document.getElementById("addUserBtn");
 const addUserModal = document.getElementById("addUserModal");
 const submitUserBtn = document.getElementById("submitUserBtn");
 const usernameInput = document.getElementById("usernameInput");
 const userList = document.getElementById("userList");
 const logoutBtn = document.getElementById("logoutBtn");

 if (!isAdmin && footer) {
   footer.style.display = "none";
 }
 if (!isAdmin && addUserBtn) {
   addUserBtn.style.display = "none";
 }
 if (!isAdmin && submitUserBtn) {
   submitUserBtn.disabled = true;
 }

 // ✅ THEN: add event listeners

 if (submitUserBtn) {
  submitUserBtn.addEventListener("click", async function () {
    const username = usernameInput.value.trim();
    const errorMessage = document.getElementById("errorMessage");
    const currentAdmin = localStorage.getItem("currentAdminEmail");

    if (!username) {
      errorMessage.style.display = "block";
      return;
    }

    if (!currentAdmin) {
      console.error("❌ currentAdmin is missing in localStorage!");
      alert("Error: Admin session expired. Please log in again.");
      window.location.href = "/BeeMazing-Y1/login.html";
      return;
    }

    errorMessage.style.display = "none";

    try {
      const res = await fetch("https://beemazing.onrender.com/add-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminEmail: currentAdmin,
          newUser: username,
        }),
      });

      const result = await res.json();

      if (result.success) {
        const allUserData = JSON.parse(localStorage.getItem("userData")) || {};
        if (!allUserData[currentAdmin]) {
          allUserData[currentAdmin] = { users: [], permissions: {} };
        }

        allUserData[currentAdmin].users.push(username);
        localStorage.setItem("userData", JSON.stringify(allUserData));

        usernameInput.value = "";
        addUserModal.classList.remove("show");
        await fetchUsersFromServer(currentAdmin); // 🔥 re-fetch fresh data from server
      } else {
        alert("Failed to add user: " + result.message);
      }
    } catch (err) {
      console.error("Error adding user:", err);
      alert("Error adding user. Please try again.");
    }
  });
}


  // Determine the base path (mobile or web) based on the current URL
  const isMobile = window.location.pathname.includes("/BeeMazing-Y1/mobile/");
  const basePath = isMobile ? "/BeeMazing-Y1/mobile" : "/web";


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
      userList.innerHTML = "";
    
      const users = usersFromServer || [];
      const userPermissions = permissionsFromServer || {};
      const isAdmin = localStorage.getItem("isAdmin") === "true";
    
      users.forEach((username) => {
        const newUserItem = document.createElement("li");
        newUserItem.classList.add("user-list-item");
    
        const nameContainer = document.createElement("div");
        nameContainer.style.display = "flex";
        nameContainer.style.alignItems = "center";
        nameContainer.style.gap = "8px";
    
        const userNameSpan = document.createElement("span");
        userNameSpan.textContent = username;
    
        if (userPermissions[username] === "Admin") {
          const checkmark = document.createElement("span");
          checkmark.textContent = "✓";
          checkmark.style.color = "#00C4B4";
          checkmark.style.fontSize = "16px";
          checkmark.style.fontWeight = "bold";
          checkmark.title = "Admin";
          nameContainer.appendChild(userNameSpan);
          nameContainer.appendChild(checkmark);
        } else {
          nameContainer.appendChild(userNameSpan);
        }
    
        newUserItem.addEventListener("click", async function () {
          const page = userPermissions[username] === "Admin" ? "userAdmin.html" : "users.html";
          const isLoggedInAsAdmin = localStorage.getItem("isAdmin") === "true";
        
          if (userPermissions[username] === "Admin") {
            if (isLoggedInAsAdmin) {
              // Parent logged in → direct access
              window.location.href = `${basePath}/2-UserProfiles/${page}?admin=${encodeURIComponent(currentAdmin)}&user=${encodeURIComponent(username)}`;
            } else {
              // Child logged in → ask for password
              const enteredPassword = prompt("Enter Parent Password to access Admin profile:");
              if (!enteredPassword) {
                alert("Password is required to access Admin profile.");
                return;
              }
        
              try {
                const res = await fetch(`https://beemazing.onrender.com/verify-admin-password`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email: currentAdmin, password: enteredPassword }),
                });
                const data = await res.json();
        
                if (res.ok && data.success) {
                  window.location.href = `${basePath}/2-UserProfiles/${page}?admin=${encodeURIComponent(currentAdmin)}&user=${encodeURIComponent(username)}`;
                } else {
                  alert(data.message || "Incorrect password. Access denied.");
                }
              } catch (err) {
                console.error("Error verifying admin password:", err);
                alert("Failed to verify password. Please check your connection.");
              }
            }
          } else {
            // Normal Child user → open directly
            window.location.href = `${basePath}/2-UserProfiles/${page}?admin=${encodeURIComponent(currentAdmin)}&user=${encodeURIComponent(username)}`;
          }
        });
        
    
        newUserItem.appendChild(nameContainer);
    
        // Admin-only buttons (mobile)
        if (isMobile && isAdmin) {
          const actionsContainer = document.createElement("div");
          actionsContainer.style.display = "flex";
          actionsContainer.style.gap = "8px";
    
          const removeBtn = document.createElement("button");
          removeBtn.classList.add("remove-user-btn");
          removeBtn.textContent = "X";
          removeBtn.addEventListener("click", function (event) {
            event.stopPropagation();
            showConfirmModal(username);
          });
    
          const editBtn = document.createElement("button");
          editBtn.classList.add("remove-user-btn");
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