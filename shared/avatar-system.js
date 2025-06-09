// BeeMazing Avatar System
// Automatic avatar generation with smart conflict resolution

class AvatarSystem {
    constructor() {
        // 10 colors that match the BeeMazing theme
        this.colors = [
            '#FBB740', // Main orange/yellow
            '#FF8A50', // Warm orange
            '#8BC34A', // Nature green
            '#00C4B4', // Teal (already used in app)
            '#5D4E41', // Warm brown
            '#9C6644', // Lighter brown
            '#FF7043', // Coral
            '#66BB6A', // Fresh green
            '#42A5F5', // Sky blue
            '#AB47BC'  // Purple
        ];
        
        this.usedColors = new Set();
        this.avatarData = {};
    }

    // Initialize avatar system with existing users
    initialize(adminEmail) {
        const userData = JSON.parse(localStorage.getItem("userData")) || {};
        const users = userData[adminEmail]?.users || [];
        const existingAvatars = userData[adminEmail]?.avatars || {};
        
        this.avatarData = { ...existingAvatars };
        this.usedColors.clear();
        
        // Track used colors
        Object.values(this.avatarData).forEach(avatar => {
            this.usedColors.add(avatar.color);
        });
        
        // Generate avatars for users who don't have them
        users.forEach(username => {
            if (!this.avatarData[username]) {
                this.generateAvatar(username, users);
            }
        });
        
        // Resolve any conflicts
        this.resolveConflicts(users);
        
        // Save updated avatar data
        this.saveAvatarData(adminEmail);
        
        return this.avatarData;
    }

    // Generate avatar for a new user
    generateAvatar(username, allUsers = []) {
        const color = this.getNextAvailableColor();
        const initials = this.generateInitials(username, allUsers);
        
        this.avatarData[username] = {
            initials: initials,
            color: color,
            username: username
        };
        
        return this.avatarData[username];
    }

    // Get next available color
    getNextAvailableColor() {
        for (let color of this.colors) {
            if (!this.usedColors.has(color)) {
                this.usedColors.add(color);
                return color;
            }

        }
        // If all colors are used, cycle through them
        const colorIndex = this.usedColors.size % this.colors.length;
        return this.colors[colorIndex];
    }

    // Generate initials with smart conflict resolution
    generateInitials(username, allUsers) {
        if (!username) return '?';
        
        const cleanName = username.trim().toUpperCase();
        let initials = cleanName.charAt(0);
        
        // Check for conflicts and determine appropriate length
        const targetLength = this.determineInitialLength(cleanName, allUsers);
        
        if (targetLength >= 2 && cleanName.length >= 2) {
            // Find second letter (skip spaces)
            const words = cleanName.split(/\s+/).filter(word => word.length > 0);
            if (words.length > 1) {
                // Multiple words - take first letter of first two words
                initials = words[0].charAt(0) + words[1].charAt(0);
            } else {
                // Single word - take first two letters
                initials = cleanName.substring(0, 2);
            }
        }
        
        if (targetLength >= 3 && cleanName.length >= 3) {
            const words = cleanName.split(/\s+/).filter(word => word.length > 0);
            if (words.length >= 3) {
                // Three or more words - take first letter of first three words
                initials = words[0].charAt(0) + words[1].charAt(0) + words[2].charAt(0);
            } else if (words.length === 2) {
                // Two words - first letter of first word + first two of second
                initials = words[0].charAt(0) + words[1].substring(0, 2);
            } else {
                // Single word - take first three letters
                initials = cleanName.substring(0, 3);
            }
        }
        
        return initials;
    }

    // Determine how many letters needed to avoid conflicts
    determineInitialLength(newName, allUsers) {
        const existing = allUsers.filter(user => user !== newName);
        
        // Try 1 letter
        const firstLetter = newName.charAt(0);
        const firstLetterConflicts = existing.filter(user => 
            user.toUpperCase().charAt(0) === firstLetter
        );
        
        if (firstLetterConflicts.length === 0) {
            return 1;
        }
        
        // Try 2 letters
        const twoLetters = this.generateTwoLetters(newName);
        const twoLetterConflicts = existing.filter(user => {
            const userTwoLetters = this.generateTwoLetters(user);
            return userTwoLetters === twoLetters;
        });
        
        if (twoLetterConflicts.length === 0) {
            return 2;
        }
        
        // Use 3 letters
        return 3;
    }

    // Generate two letters from name
    generateTwoLetters(name) {
        const cleanName = name.trim().toUpperCase();
        const words = cleanName.split(/\s+/).filter(word => word.length > 0);
        
        if (words.length > 1) {
            return words[0].charAt(0) + words[1].charAt(0);
        } else {
            return cleanName.substring(0, 2);
        }
    }

    // Resolve conflicts for all existing users
    resolveConflicts(allUsers) {
        // Group users by their current initials
        const initialGroups = {};
        
        allUsers.forEach(username => {
            if (this.avatarData[username]) {
                const initials = this.avatarData[username].initials;
                if (!initialGroups[initials]) {
                    initialGroups[initials] = [];
                }
                initialGroups[initials].push(username);
            }
        });
        
        // Resolve conflicts
        Object.entries(initialGroups).forEach(([initials, users]) => {
            if (users.length > 1) {
                // There's a conflict - regenerate initials for all users in this group
                users.forEach(username => {
                    const newInitials = this.generateInitials(username, allUsers);
                    this.avatarData[username].initials = newInitials;
                });
            }
        });
    }

    // Add new user and generate avatar
    addUser(username, adminEmail) {
        const userData = JSON.parse(localStorage.getItem("userData")) || {};
        const users = userData[adminEmail]?.users || [];
        const allUsers = [...users, username];
        
        // Generate avatar for new user
        this.generateAvatar(username, allUsers);
        
        // Resolve conflicts for all users
        this.resolveConflicts(allUsers);
        
        // Save updated avatar data
        this.saveAvatarData(adminEmail);
        
        return this.avatarData[username];
    }

    // Remove user and their avatar
    removeUser(username, adminEmail) {
        if (this.avatarData[username]) {
            const removedColor = this.avatarData[username].color;
            delete this.avatarData[username];
            this.usedColors.delete(removedColor);
        }
        
        this.saveAvatarData(adminEmail);
    }

    // Save avatar data to localStorage
    saveAvatarData(adminEmail) {
        const userData = JSON.parse(localStorage.getItem("userData")) || {};
        if (!userData[adminEmail]) {
            userData[adminEmail] = { users: [], permissions: {}, avatars: {} };
        }
        userData[adminEmail].avatars = this.avatarData;
        localStorage.setItem("userData", JSON.stringify(userData));
    }

    // Get avatar for specific user
    getAvatar(username) {
        return this.avatarData[username] || null;
    }

    // Get all avatars
    getAllAvatars() {
        return this.avatarData;
    }

    // Generate HTML for avatar
    generateAvatarHTML(username, size = 40, additionalClasses = '', additionalStyles = '') {
        const avatar = this.getAvatar(username);
        if (!avatar) {
            return `<div class="user-avatar ${additionalClasses}" style="width: ${size}px; height: ${size}px; background: #ccc; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; ${additionalStyles}">?</div>`;
        }
        
        const fontSize = Math.max(size * 0.4, 10);
        
        // For task avatars, remove default margin and use inherited styles
        const isTaskAvatar = additionalClasses.includes('task-avatar');
        const baseStyles = isTaskAvatar ? 
            `width: ${size}px; height: ${size}px; background: ${avatar.color}; font-size: ${fontSize}px; ${additionalStyles}` :
            `width: ${size}px; height: ${size}px; background: ${avatar.color}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: ${fontSize}px; text-shadow: 0 1px 2px rgba(0,0,0,0.3); box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-right: 10px; flex-shrink: 0; ${additionalStyles}`;
        
        return `<div class="user-avatar ${additionalClasses}" style="${baseStyles}">${avatar.initials}</div>`;
    }

    // Generate profile avatar HTML (for replacing profile icon)
    generateProfileAvatarHTML(username, size = 40) {
        const avatar = this.getAvatar(username);
        if (!avatar) {
            return `<div class="profile-avatar user-avatar" style="
                width: ${size}px; 
                height: ${size}px; 
                background: #ccc; 
                border-radius: 50%; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                font-weight: bold; 
                color: white;
                position: fixed;
                top: 10px;
                right: 20px;
                cursor: pointer;
                z-index: 202;
                transition: transform 0.3s ease;
                border: 2px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            ">?</div>`;
        }
        
        const fontSize = Math.max(size * 0.4, 12);
        return `
            <div class="profile-avatar user-avatar" style="
                width: ${size}px; 
                height: ${size}px; 
                background: ${avatar.color}; 
                border-radius: 50%; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                font-weight: bold; 
                color: white; 
                font-size: ${fontSize}px;
                text-shadow: 0 1px 2px rgba(0,0,0,0.3);
                position: fixed;
                top: 10px;
                right: 20px;
                cursor: pointer;
                z-index: 202;
                transition: transform 0.3s ease;
                border: 2px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            ">${avatar.initials}</div>
        `;
    }

    // Update existing users when a new user is added
    updateExistingAvatars(adminEmail) {
        const userData = JSON.parse(localStorage.getItem("userData")) || {};
        const users = userData[adminEmail]?.users || [];
        
        // Regenerate all avatars to resolve conflicts
        this.avatarData = {};
        this.usedColors.clear();
        
        users.forEach(username => {
            this.generateAvatar(username, users);
        });
        
        this.resolveConflicts(users);
        this.saveAvatarData(adminEmail);
    }

    // Check if profile icon has been set up with functionality
    isProfileIconReady(profileIcon) {
        // Check if the profile icon has event listeners attached
        return profileIcon.onclick || 
               profileIcon.hasAttribute('data-ready') ||
               profileIcon._listeners ||
               false;
    }

    // Replace profile icon with current user's avatar
    replaceProfileIconWithAvatar(currentUser, size = 40) {
        const profileIcon = document.getElementById('profileIcon');
        if (profileIcon && currentUser) {
            // Generate avatar but keep the same element to preserve functionality
            const avatar = this.getAvatar(currentUser);
            if (!avatar) return null;
            
            const fontSize = Math.max(size * 0.4, 12);
            
            // Instead of replacing the element, modify its appearance to look like an avatar
            profileIcon.innerHTML = avatar.initials;
            profileIcon.style.cssText = `
                width: ${size}px; 
                height: ${size}px; 
                background: ${avatar.color}; 
                border-radius: 50%; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                font-weight: bold; 
                color: white; 
                font-size: ${fontSize}px;
                text-shadow: 0 1px 2px rgba(0,0,0,0.3);
                position: fixed;
                top: 10px;
                right: 20px;
                cursor: pointer;
                z-index: 202;
                transition: transform 0.3s ease;
                border: 2px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                font-family: 'Poppins', Arial, sans-serif;
            `;
            
            // Add hover effect
            profileIcon.onmouseenter = function() {
                this.style.transform = 'scale(1.1)';
                this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            };
            
            profileIcon.onmouseleave = function() {
                this.style.transform = 'scale(1)';
                this.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
            };
            
            return profileIcon;
        }
        return null;
    }

    // Initialize profile avatar replacement when page loads
    initializeProfileAvatar() {
        const urlParams = new URLSearchParams(window.location.search);
        const currentUser = urlParams.get("user") || localStorage.getItem("currentUser");
        const admin = urlParams.get("admin") || localStorage.getItem("currentAdminEmail");
        
        if (currentUser && admin) {
            // Initialize avatar system first
            this.initialize(admin);
            
            // Wait for profile icon to be fully set up, then replace it
            // We need to wait longer since the functionality is added after DOM load
            const attemptReplacement = (attempt = 0) => {
                const maxAttempts = 20;
                const delay = Math.min(200 * (attempt + 1), 3000); // Linear increase, max 3s
                
                setTimeout(() => {
                    const profileIcon = document.getElementById('profileIcon');
                    // Check if profile icon exists and has been set up with functionality
                    if (profileIcon && this.isProfileIconReady(profileIcon)) {
                        console.log(`Avatar replacement successful on attempt ${attempt + 1}`);
                        this.replaceProfileIconWithAvatar(currentUser, 40);
                    } else if (attempt < maxAttempts) {
                        console.log(`Profile icon not ready, trying again in ${delay}ms (attempt ${attempt + 1})`);
                        attemptReplacement(attempt + 1);
                    } else {
                        console.warn('Profile icon not ready after all attempts, proceeding anyway');
                        if (profileIcon) {
                            this.replaceProfileIconWithAvatar(currentUser, 40);
                        }
                    }
                }, delay);
            };
            
            attemptReplacement();
        }
    }
}

// Global avatar system instance
window.avatarSystem = new AvatarSystem();

// Auto-initialize when DOM is loaded
const initializeAvatarSystem = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const admin = urlParams.get("admin") || localStorage.getItem("currentAdminEmail");
    if (admin) {
        window.avatarSystem.initialize(admin);
        // Profile avatar replacement is now handled by page-specific scripts
        // window.avatarSystem.initializeProfileAvatar();
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAvatarSystem);
} else {
    // Initialize immediately if DOM is already loaded
    initializeAvatarSystem();
}

// Also try to initialize after a delay to catch dynamically created elements
setTimeout(initializeAvatarSystem, 500);