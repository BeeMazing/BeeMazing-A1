// Redirect Interceptor - Prevents access to taskz.html and fixes the redirect issue
// This script should be loaded on every page to catch and fix the taskz.html problem

(function() {
    'use strict';
    
    console.log('🔧 Enhanced Redirect Interceptor loaded');
    
    // Function to build correct tasks URL with parameters
    function getCorrectTasksUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const admin = urlParams.get('admin');
        const user = urlParams.get('user');
        
        let correctUrl = '/BeeMazing-A1/mobile/3-Tasks/tasks.html';
        const params = new URLSearchParams();
        
        if (admin) params.append('admin', admin);
        if (user) params.append('user', user);
        
        // Preserve other parameters
        for (const [key, value] of urlParams.entries()) {
            if (key !== 'admin' && key !== 'user') {
                params.append(key, value);
            }
        }
        
        // Add timestamp to prevent caching
        params.append('_t', Date.now().toString());
        
        if (params.toString()) {
            correctUrl += '?' + params.toString();
        }
        
        return correctUrl;
    }
    
    // Aggressive immediate check and redirect
    function forceCorrectUrl() {
        if (window.location.pathname.includes('taskz.html') || window.location.href.includes('taskz.html')) {
            console.error('❌ INTERCEPTED: taskz.html access detected!');
            console.log('📍 Current URL:', window.location.href);
            
            const correctUrl = getCorrectTasksUrl();
            console.log('✅ Force redirecting to correct URL:', correctUrl);
            
            // Try multiple redirect methods
            try {
                window.location.replace(correctUrl);
            } catch (e) {
                console.error('Replace failed, trying assign:', e);
                window.location.assign(correctUrl);
            }
            return true;
        }
        return false;
    }
    
    // Initial check
    if (forceCorrectUrl()) {
        return; // Stop execution if we redirected
    }
    
    // Set up continuous monitoring
    let lastUrl = window.location.href;
    const urlMonitor = setInterval(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
            console.log('🔍 URL changed from', lastUrl, 'to', currentUrl);
            lastUrl = currentUrl;
            if (forceCorrectUrl()) {
                clearInterval(urlMonitor);
            }
        }
    }, 50); // Check every 50ms
    
    // Override window.location.href setter to catch taskz.html redirects
    const originalHref = Object.getOwnPropertyDescriptor(Location.prototype, 'href');
    if (originalHref && originalHref.set) {
        Object.defineProperty(Location.prototype, 'href', {
            set: function(url) {
                if (typeof url === 'string' && url.includes('taskz.html')) {
                    console.error('❌ INTERCEPTED: Attempt to navigate to taskz.html blocked!');
                    console.log('📍 Attempted URL:', url);
                    
                    // Force correct URL construction
                    const correctUrl = url.replace(/taskz\.html/g, 'tasks.html');
                    
                    console.log('✅ Corrected URL:', correctUrl);
                    originalHref.set.call(this, correctUrl);
                } else {
                    originalHref.set.call(this, url);
                }
            },
            get: originalHref.get,
            enumerable: true,
            configurable: true
        });
    }
    
    // Override window.location.assign to catch taskz.html
    try {
        const originalAssign = window.location.assign;
        if (originalAssign) {
            Object.defineProperty(window.location, 'assign', {
                value: function(url) {
                    if (typeof url === 'string' && url.includes('taskz.html')) {
                        console.error('❌ INTERCEPTED: window.location.assign to taskz.html blocked!');
                        console.log('📍 Attempted URL:', url);
                        
                        const correctUrl = url.replace(/taskz\.html/g, 'tasks.html');
                        
                        console.log('✅ Assign redirected to correct URL:', correctUrl);
                        originalAssign.call(this, correctUrl);
                    } else {
                        originalAssign.call(this, url);
                    }
                },
                writable: true,
                configurable: true
            });
        }
    } catch (e) {
        console.log('⚠️ Could not override window.location.assign:', e.message);
    }
    
    // Override window.location.replace to catch taskz.html
    try {
        const originalReplace = window.location.replace;
        if (originalReplace) {
            Object.defineProperty(window.location, 'replace', {
                value: function(url) {
                    if (typeof url === 'string' && url.includes('taskz.html')) {
                        console.error('❌ INTERCEPTED: window.location.replace to taskz.html blocked!');
                        console.log('📍 Attempted URL:', url);
                        
                        const correctUrl = url.replace(/taskz\.html/g, 'tasks.html');
                        
                        console.log('✅ Replace redirected to correct URL:', correctUrl);
                        originalReplace.call(this, correctUrl);
                    } else {
                        originalReplace.call(this, url);
                    }
                },
                writable: true,
                configurable: true
            });
        }
    } catch (e) {
        console.log('⚠️ Could not override window.location.replace:', e.message);
    }
    
    // Monitor for any anchor tags or links that might point to taskz.html
    function fixTaskzLinks() {
        const links = document.querySelectorAll('a[href*="taskz.html"]');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.includes('taskz.html')) {
                console.warn('🔧 FIXED: Found link pointing to taskz.html, correcting...');
                console.log('📍 Original href:', href);
                
                const correctedHref = href.replace('taskz.html', 'tasks.html');
                link.setAttribute('href', correctedHref);
                
                console.log('✅ Corrected href:', correctedHref);
            }
        });
    }
    
    // Fix links on page load
    document.addEventListener('DOMContentLoaded', fixTaskzLinks);
    
    // Fix links when DOM changes (for dynamically added content)
    if (window.MutationObserver) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Check if any new nodes contain taskz.html links
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1) { // Element node
                            if (node.tagName === 'A' && node.href && node.href.includes('taskz.html')) {
                                const correctedHref = node.href.replace('taskz.html', 'tasks.html');
                                console.warn('🔧 FIXED: Dynamically added taskz.html link');
                                node.href = correctedHref;
                            }
                            
                            // Check child elements too
                            const taskzLinks = node.querySelectorAll && node.querySelectorAll('a[href*="taskz.html"]');
                            if (taskzLinks && taskzLinks.length > 0) {
                                taskzLinks.forEach(link => {
                                    const correctedHref = link.href.replace('taskz.html', 'tasks.html');
                                    console.warn('🔧 FIXED: Dynamically added taskz.html child link');
                                    link.href = correctedHref;
                                });
                            }
                        }
                    });
                }
            });
        });
        
        observer.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true
        });
    }
    
    // Intercept form submissions that might redirect to taskz.html
    document.addEventListener('submit', function(e) {
        const form = e.target;
        if (form.tagName === 'FORM') {
            const action = form.getAttribute('action');
            if (action && action.includes('taskz.html')) {
                console.error('❌ INTERCEPTED: Form submission to taskz.html blocked!');
                console.log('📍 Form action:', action);
                
                const correctedAction = action.replace('taskz.html', 'tasks.html');
                form.setAttribute('action', correctedAction);
                
                console.log('✅ Corrected action:', correctedAction);
            }
        }
    });
    
    // Monitor for popstate events (back/forward navigation)
    window.addEventListener('popstate', function(e) {
        if (window.location.href.includes('taskz.html')) {
            console.error('❌ INTERCEPTED: Browser navigation to taskz.html via popstate!');
            console.log('📍 Current URL:', window.location.href);
            
            const correctUrl = getCorrectTasksUrl();
            console.log('✅ Redirecting to:', correctUrl);
            
            window.location.replace(correctUrl);
        }
    });
    
    // Override history methods too
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(state, title, url) {
        if (url && url.includes('taskz.html')) {
            console.error('❌ INTERCEPTED: history.pushState to taskz.html blocked!');
            url = url.replace(/taskz\.html/g, 'tasks.html');
            console.log('✅ Corrected pushState URL:', url);
        }
        return originalPushState.call(this, state, title, url);
    };
    
    history.replaceState = function(state, title, url) {
        if (url && url.includes('taskz.html')) {
            console.error('❌ INTERCEPTED: history.replaceState to taskz.html blocked!');
            url = url.replace(/taskz\.html/g, 'tasks.html');
            console.log('✅ Corrected replaceState URL:', url);
        }
        return originalReplaceState.call(this, state, title, url);
    };
    
    // Debug: Log any attempts to access taskz.html
    console.log('✅ Enhanced Redirect Interceptor fully active - all taskz.html access will be blocked and fixed');
    
    // Export a function to manually check and fix current URL
    window.fixTaskzUrl = function() {
        if (window.location.href.includes('taskz.html')) {
            const correctUrl = getCorrectTasksUrl();
            console.log('🔧 Manual fix: Redirecting to', correctUrl);
            window.location.replace(correctUrl);
            return true;
        }
        console.log('✅ URL is correct, no fix needed');
        return false;
    };
    
})();