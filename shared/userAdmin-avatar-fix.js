// UserAdmin Avatar Fix
// This file specifically handles replacing the profile icon with avatar in userAdmin.html
// It ensures the replacement happens AFTER the original functionality is set up

(function() {
    console.log('UserAdmin Avatar Fix: Starting initialization');
    
    // Function to add super-specific CSS to override existing styles
    function addAvatarOverrideCSS(avatarColor, fontSize) {
        const styleId = 'avatar-override-css';
        if (document.getElementById(styleId)) {
            document.getElementById(styleId).remove(); // Remove old one
        }
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            div#profileIcon.profile-icon[data-avatar-replaced="true"] {
                width: 40px !important;
                height: 40px !important;
                background: ${avatarColor} !important;
                background-color: ${avatarColor} !important;
                border-radius: 50% !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-weight: bold !important;
                color: white !important;
                font-size: ${fontSize}px !important;
                text-shadow: 0 1px 2px rgba(0,0,0,0.3) !important;
                position: fixed !important;
                top: 10px !important;
                right: 20px !important;
                cursor: pointer !important;
                z-index: 202 !important;
                transition: transform 0.3s ease !important;
                border: 2px solid rgba(255, 255, 255, 0.2) !important;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
                font-family: 'Poppins', Arial, sans-serif !important;
                padding: 0 !important;
                margin: 0 !important;
                line-height: 1 !important;
                text-decoration: none !important;
                text-align: center !important;
                background-image: none !important;
            }
            
            div#profileIcon.profile-icon[data-avatar-replaced="true"]:hover {
                transform: scale(1.1) !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
            }
            
            div#profileIcon.profile-icon[data-avatar-replaced="true"] svg {
                display: none !important;
            }
            
            div#profileIcon.profile-icon[data-avatar-replaced="true"] * {
                display: none !important;
            }
            
            div#profileIcon.profile-icon[data-avatar-replaced="true"]::before {
                content: '' !important;
            }
        `;
        document.head.appendChild(style);
        console.log('UserAdmin Avatar Fix: Added override CSS with color:', avatarColor);
    }

    // Function to replace profile icon with avatar while preserving functionality
    function replaceProfileIconWithAvatar() {
        const profileIcon = document.getElementById('profileIcon');
        const urlParams = new URLSearchParams(window.location.search);
        const currentUser = urlParams.get("user") || localStorage.getItem("currentUser");
        const admin = urlParams.get("admin") || localStorage.getItem("currentAdminEmail");
        
        if (!profileIcon || !currentUser || !window.avatarSystem) {
            console.log('UserAdmin Avatar Fix: Missing requirements', {
                profileIcon: !!profileIcon,
                currentUser: currentUser,
                avatarSystem: !!window.avatarSystem
            });
            return false;
        }
        
        // Don't replace if already replaced
        if (profileIcon.hasAttribute('data-avatar-replaced')) {
            console.log('UserAdmin Avatar Fix: Profile icon already replaced');
            return true;
        }
        
        // Initialize avatar system if needed
        if (admin) {
            window.avatarSystem.initialize(admin);
        }
        
        // Get avatar data
        const avatar = window.avatarSystem.getAvatar(currentUser);
        if (!avatar) {
            console.log('UserAdmin Avatar Fix: No avatar found for user:', currentUser);
            return false;
        }
        
        // Transform the existing element instead of replacing it
        const size = 40;
        const fontSize = Math.max(size * 0.4, 12);
        
        // First, clear all existing content including SVG
        profileIcon.innerHTML = '';
        
        // Add override CSS with specific color and size
        addAvatarOverrideCSS(avatar.color, fontSize);
        
        // Create a text node for the initials to avoid any HTML/SVG conflicts
        const textNode = document.createTextNode(avatar.initials);
        profileIcon.appendChild(textNode);
        
        // Mark as replaced BEFORE applying styles
        profileIcon.setAttribute('data-avatar-replaced', 'true');
        
        // Force the styles with setProperty
        profileIcon.style.setProperty('background-color', avatar.color, 'important');
        profileIcon.style.setProperty('background', avatar.color, 'important');
        profileIcon.style.setProperty('font-size', fontSize + 'px', 'important');
        profileIcon.style.setProperty('color', 'white', 'important');
        profileIcon.style.setProperty('display', 'flex', 'important');
        profileIcon.style.setProperty('align-items', 'center', 'important');
        profileIcon.style.setProperty('justify-content', 'center', 'important');
        profileIcon.style.setProperty('border-radius', '50%', 'important');
        
        // Force a reflow to apply styles
        profileIcon.offsetHeight;
        
        // Add a small delay to ensure styles are applied
        setTimeout(() => {
            const computedStyles = window.getComputedStyle(profileIcon);
            console.log('UserAdmin Avatar Fix: Final computed background:', computedStyles.backgroundColor);
            console.log('UserAdmin Avatar Fix: Final computed border-radius:', computedStyles.borderRadius);
            
            // If styles still aren't applied, force them again
            if (computedStyles.borderRadius !== '50%' || !computedStyles.backgroundColor.includes('rgb')) {
                console.log('UserAdmin Avatar Fix: Styles not applied, forcing again...');
                profileIcon.style.cssText = `
                    width: 40px !important;
                    height: 40px !important;
                    background: ${avatar.color} !important;
                    background-color: ${avatar.color} !important;
                    border-radius: 50% !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    font-weight: bold !important;
                    color: white !important;
                    font-size: ${fontSize}px !important;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.3) !important;
                    position: fixed !important;
                    top: 10px !important;
                    right: 20px !important;
                    cursor: pointer !important;
                    z-index: 202 !important;
                    transition: transform 0.3s ease !important;
                    border: 2px solid rgba(255, 255, 255, 0.2) !important;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
                    font-family: 'Poppins', Arial, sans-serif !important;
                `;
            }
        }, 100);
        
        console.log('UserAdmin Avatar Fix: Successfully replaced profile icon with avatar for user:', currentUser);
        console.log('UserAdmin Avatar Fix: Avatar details:', avatar);
        console.log('UserAdmin Avatar Fix: Profile icon HTML after replacement:', profileIcon.outerHTML);
        console.log('UserAdmin Avatar Fix: Computed styles:', window.getComputedStyle(profileIcon));
        console.log('UserAdmin Avatar Fix: Background color:', window.getComputedStyle(profileIcon).backgroundColor);
        console.log('UserAdmin Avatar Fix: Border radius:', window.getComputedStyle(profileIcon).borderRadius);
        return true;
    }
    
    // Function to wait for page to be fully loaded, then apply avatar
    function waitForPageCompletion() {
        console.log('UserAdmin Avatar Fix: Waiting for page completion');
        
        // Wait for page to be fully loaded and give time for all scripts to run
        setTimeout(() => {
            const profileIcon = document.getElementById('profileIcon');
            const avatarSystemReady = window.avatarSystem;
            
            console.log('UserAdmin Avatar Fix: Final attempt', {
                profileIcon: !!profileIcon,
                avatarSystemReady: !!avatarSystemReady
            });
            
            if (avatarSystemReady && profileIcon && !profileIcon.hasAttribute('data-avatar-replaced')) {
                console.log('UserAdmin Avatar Fix: Applying avatar replacement');
                if (replaceProfileIconWithAvatar()) {
                    console.log('UserAdmin Avatar Fix: Avatar replacement completed successfully');
                }
            } else {
                console.warn('UserAdmin Avatar Fix: Could not replace avatar', {
                    avatarSystemReady: !!avatarSystemReady,
                    profileIcon: !!profileIcon,
                    alreadyReplaced: profileIcon ? profileIcon.hasAttribute('data-avatar-replaced') : false
                });
            }
        }, 3000); // Wait 3 seconds after page load
    }
    
    // Add manual trigger function for testing
    window.manuallyReplaceAvatar = function() {
        console.log('Manual avatar replacement triggered');
        const profileIcon = document.getElementById('profileIcon');
        if (profileIcon) {
            profileIcon.removeAttribute('data-avatar-replaced');
            return replaceProfileIconWithAvatar();
        }
        return false;
    };
    
    // Add super simple test function
    window.testAvatarChange = function() {
        console.log('Testing simple avatar change');
        const profileIcon = document.getElementById('profileIcon');
        if (profileIcon) {
            // Just change background color and content as a simple test
            profileIcon.innerHTML = 'L';
            profileIcon.style.backgroundColor = '#FF0000';
            profileIcon.style.color = 'white';
            profileIcon.style.borderRadius = '50%';
            profileIcon.style.display = 'flex';
            profileIcon.style.alignItems = 'center';
            profileIcon.style.justifyContent = 'center';
            console.log('Applied simple test styles');
            return true;
        }
        console.log('Profile icon not found');
        return false;
    };
    
    // Start the process - wait for window load to ensure everything is ready
    window.addEventListener('load', waitForPageCompletion);
    
    // Backup: if window is already loaded, start immediately
    if (document.readyState === 'complete') {
        waitForPageCompletion();
    }
    
})();