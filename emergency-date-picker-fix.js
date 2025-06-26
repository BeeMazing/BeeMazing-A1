// 🚨 EMERGENCY DATE PICKER FIX - BeeMazing
// This script fixes common date picker issues when the main initialization fails
// Usage: Copy and paste this entire script into browser console, then press Enter

console.log('🚨 EMERGENCY DATE PICKER FIX STARTING...');

// Emergency fix function
function emergencyDatePickerFix() {
    console.log('🔧 Running emergency date picker fix...');
    
    try {
        // Step 1: Check if required elements exist
        const container = document.getElementById('dayScrollContainer');
        const monthLabel = document.getElementById('monthLabel');
        
        if (!container) {
            console.error('❌ dayScrollContainer not found! Check if you are on the correct page.');
            return false;
        }
        
        if (!monthLabel) {
            console.error('❌ monthLabel not found! Check if you are on the correct page.');
            return false;
        }
        
        console.log('✅ Required elements found');
        
        // Step 2: Clear container and show loading
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: #FBB740;">🔄 Emergency fix in progress...</div>';
        
        // Step 3: Define format date function (in case it's missing)
        const formatDate = (d) => d.toISOString().split("T")[0];
        
        // Step 4: Generate dates manually
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const todayStr = formatDate(today);
        
        console.log(`📅 Generating ${daysInMonth} days for ${today.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`);
        
        // Update month label
        monthLabel.textContent = today.toLocaleDateString(undefined, {
            month: 'long',
            year: 'numeric'
        });
        
        // Clear container
        container.innerHTML = '';
        container.style.display = 'flex';
        container.style.gap = '8px';
        container.style.overflowX = 'auto';
        container.style.padding = '10px';
        
        let todaySelected = false;
        
        // Generate days
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(currentYear, currentMonth, i);
            const dateStr = formatDate(date);
            
            // Create day container
            const dayContainer = document.createElement('div');
            dayContainer.style.display = 'flex';
            dayContainer.style.flexDirection = 'column';
            dayContainer.style.alignItems = 'center';
            dayContainer.style.minWidth = '38px';
            
            // Create day label
            const dayLabel = document.createElement('span');
            const dayAbbr = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()];
            dayLabel.textContent = dayAbbr;
            dayLabel.style.fontSize = '10px';
            dayLabel.style.color = '#5D4E41';
            dayLabel.style.fontWeight = '600';
            dayLabel.style.marginBottom = '2px';
            
            // Create day button
            const dayBtn = document.createElement('div');
            dayBtn.className = 'day';
            dayBtn.textContent = i;
            dayBtn.dataset.date = dateStr;
            
            // Apply styles
            dayBtn.style.width = '38px';
            dayBtn.style.height = '38px';
            dayBtn.style.lineHeight = '38px';
            dayBtn.style.textAlign = 'center';
            dayBtn.style.borderRadius = '50%';
            dayBtn.style.background = 'transparent';
            dayBtn.style.color = '#5D4E41';
            dayBtn.style.fontWeight = 'bold';
            dayBtn.style.cursor = 'pointer';
            dayBtn.style.border = '2px solid transparent';
            dayBtn.style.transition = 'all 0.2s ease';
            dayBtn.style.boxSizing = 'border-box';
            
            // Add hover effect
            dayBtn.addEventListener('mouseenter', () => {
                if (!dayBtn.classList.contains('selected')) {
                    dayBtn.style.background = 'rgba(251, 183, 64, 0.1)';
                    dayBtn.style.borderColor = 'rgba(251, 183, 64, 0.3)';
                }
            });
            
            dayBtn.addEventListener('mouseleave', () => {
                if (!dayBtn.classList.contains('selected')) {
                    dayBtn.style.background = 'transparent';
                    dayBtn.style.borderColor = 'transparent';
                }
            });
            
            // Add click handler
            dayBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log(`📅 Emergency fix: Date selected: ${dateStr}`);
                
                // Remove selection from all days
                document.querySelectorAll('.day').forEach(d => {
                    d.classList.remove('selected');
                    d.style.background = d.classList.contains('today') ? 'rgba(251, 183, 64, 0.1)' : 'transparent';
                    d.style.color = '#5D4E41';
                    d.style.borderColor = d.classList.contains('today') ? '#FBB740' : 'transparent';
                    d.style.transform = '';
                    d.style.boxShadow = '';
                });
                
                // Select this day
                dayBtn.classList.add('selected');
                dayBtn.style.background = '#FBB740';
                dayBtn.style.color = '#fff';
                dayBtn.style.borderColor = '#FBB740';
                dayBtn.style.transform = 'scale(1.05)';
                dayBtn.style.boxShadow = '0 2px 8px rgba(251, 183, 64, 0.3)';
                
                // Visual feedback
                dayBtn.style.transform = 'scale(1.1)';
                setTimeout(() => {
                    dayBtn.style.transform = 'scale(1.05)';
                }, 150);
                
                // Try to load tasks
                try {
                    if (typeof window.loadTasksForDate === 'function') {
                        window.loadTasksForDate(dateStr);
                        console.log(`✅ Emergency fix: Tasks loaded for ${dateStr}`);
                    } else {
                        console.warn('⚠️ loadTasksForDate function not found');
                    }
                } catch (error) {
                    console.error(`❌ Emergency fix: Error loading tasks:`, error);
                }
            });
            
            // Mark today
            if (dateStr === todayStr) {
                dayBtn.classList.add('today');
                dayBtn.classList.add('selected');
                dayBtn.style.background = '#FBB740';
                dayBtn.style.color = '#fff';
                dayBtn.style.borderColor = '#fff';
                dayBtn.style.transform = 'scale(1.05)';
                dayBtn.style.boxShadow = '0 2px 12px rgba(251, 183, 64, 0.5)';
                todaySelected = true;
                console.log(`📅 Emergency fix: Today marked and selected: ${dateStr}`);
            } else if (dateStr === todayStr) {
                // Just today, not selected
                dayBtn.classList.add('today');
                dayBtn.style.borderColor = '#FBB740';
                dayBtn.style.background = 'rgba(251, 183, 64, 0.1)';
            }
            
            dayContainer.appendChild(dayLabel);
            dayContainer.appendChild(dayBtn);
            container.appendChild(dayContainer);
        }
        
        console.log(`✅ Emergency fix: Generated ${daysInMonth} days`);
        
        // Step 5: Ensure today is selected and scroll to it
        setTimeout(() => {
            const selectedDay = document.querySelector('.day.selected');
            if (selectedDay) {
                selectedDay.scrollIntoView({ behavior: 'smooth', inline: 'center' });
                console.log('✅ Emergency fix: Scrolled to selected date');
                
                // Try to load tasks for selected date
                try {
                    if (typeof window.loadTasksForDate === 'function') {
                        window.loadTasksForDate(selectedDay.dataset.date);
                        console.log(`✅ Emergency fix: Tasks loaded for selected date: ${selectedDay.dataset.date}`);
                    }
                } catch (error) {
                    console.error('❌ Emergency fix: Error loading tasks for selected date:', error);
                }
            } else {
                console.warn('⚠️ Emergency fix: No date selected after generation');
                // Force select first day
                const firstDay = container.querySelector('.day');
                if (firstDay) {
                    firstDay.click();
                    console.log('✅ Emergency fix: First day selected as fallback');
                }
            }
        }, 100);
        
        console.log('🎉 EMERGENCY DATE PICKER FIX COMPLETED!');
        return true;
        
    } catch (error) {
        console.error('❌ Emergency fix failed:', error);
        return false;
    }
}

// Emergency diagnostic function
function emergencyDiagnostic() {
    console.log('🔍 EMERGENCY DIAGNOSTIC STARTING...');
    
    const results = {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        elements: {},
        functions: {},
        errors: []
    };
    
    // Check elements
    const requiredElements = [
        'dayScrollContainer',
        'monthLabel', 
        'prevMonth',
        'nextMonth',
        'taskList'
    ];
    
    requiredElements.forEach(id => {
        const element = document.getElementById(id);
        results.elements[id] = {
            exists: !!element,
            visible: element ? element.offsetParent !== null : false,
            innerHTML: element ? element.innerHTML.substring(0, 100) + '...' : null
        };
    });
    
    // Check functions
    const requiredFunctions = [
        'loadTasksForDate',
        'generateScrollableDates',
        'formatDate'
    ];
    
    requiredFunctions.forEach(fnName => {
        results.functions[fnName] = typeof window[fnName] === 'function';
    });
    
    // Count existing days
    const existingDays = document.querySelectorAll('.day');
    const selectedDays = document.querySelectorAll('.day.selected');
    const todayDays = document.querySelectorAll('.day.today');
    
    results.datePickerState = {
        totalDays: existingDays.length,
        selectedDays: selectedDays.length,
        todayDays: todayDays.length,
        selectedDate: selectedDays.length > 0 ? selectedDays[0].dataset.date : null,
        todayDate: todayDays.length > 0 ? todayDays[0].dataset.date : null
    };
    
    console.log('📊 EMERGENCY DIAGNOSTIC RESULTS:');
    console.table(results.elements);
    console.table(results.functions);
    console.log('Date Picker State:', results.datePickerState);
    
    return results;
}

// Auto-run emergency fix
console.log('🚀 Auto-running emergency date picker fix in 1 second...');
setTimeout(() => {
    const success = emergencyDatePickerFix();
    if (success) {
        console.log('✅ Emergency fix completed successfully!');
        console.log('💡 If you still have issues, run: emergencyDiagnostic()');
    } else {
        console.log('❌ Emergency fix failed. Running diagnostic...');
        emergencyDiagnostic();
    }
}, 1000);

// Make functions available globally
window.emergencyDatePickerFix = emergencyDatePickerFix;
window.emergencyDiagnostic = emergencyDiagnostic;

console.log('🔧 Emergency functions available:');
console.log('- emergencyDatePickerFix() - Fix the date picker');
console.log('- emergencyDiagnostic() - Diagnose issues');