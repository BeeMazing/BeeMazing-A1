// Optional validation script for existing task data integrity
// Run this after deployment to verify all tasks are compatible with the new exception system

const { connectDB } = require('./backend/db.js');

class TaskValidator {
    constructor() {
        this.results = {
            totalTasks: 0,
            validTasks: 0,
            invalidTasks: 0,
            issues: [],
            recommendations: []
        };
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    validateTaskStructure(task, adminEmail) {
        const issues = [];
        
        // Check required fields
        if (!task.title || typeof task.title !== 'string') {
            issues.push('Missing or invalid title');
        }
        
        if (!task.date || typeof task.date !== 'string') {
            issues.push('Missing or invalid date');
        }
        
        if (!Array.isArray(task.users) || task.users.length === 0) {
            issues.push('Missing or invalid users array');
        }
        
        // Validate date format
        if (task.date) {
            const datePattern = /^\d{4}-\d{2}-\d{2} to \d{4}-\d{2}-\d{2}$/;
            if (!datePattern.test(task.date)) {
                issues.push(`Invalid date format: ${task.date}`);
            } else {
                // Validate date range
                const [startDate, endDate] = task.date.split(' to ');
                const start = new Date(startDate);
                const end = new Date(endDate);
                
                if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                    issues.push('Invalid date values in range');
                } else if (start > end) {
                    issues.push('Start date is after end date');
                }
            }
        }
        
        // Check for potential problematic fields
        if (task.exceptions) {
            if (typeof task.exceptions !== 'object' || Array.isArray(task.exceptions)) {
                issues.push('Invalid exceptions field type (should be object)');
            } else {
                // Validate exception structure
                for (const [date, exception] of Object.entries(task.exceptions)) {
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                        issues.push(`Invalid exception date format: ${date}`);
                    }
                    
                    if (typeof exception !== 'object') {
                        issues.push(`Invalid exception structure for date: ${date}`);
                    } else {
                        if (exception.deleted && typeof exception.deleted !== 'boolean') {
                            issues.push(`Invalid deleted flag for date: ${date}`);
                        }
                        
                        if (exception.modified) {
                            if (typeof exception.modified !== 'boolean') {
                                issues.push(`Invalid modified flag for date: ${date}`);
                            }
                            if (!exception.task || typeof exception.task !== 'object') {
                                issues.push(`Missing task data for modified exception: ${date}`);
                            }
                        }
                    }
                }
            }
        }
        
        // Check for deprecated or problematic fields
        const deprecatedFields = ['oldId', 'legacyData', 'tempField'];
        for (const field of deprecatedFields) {
            if (task.hasOwnProperty(field)) {
                issues.push(`Deprecated field found: ${field}`);
            }
        }
        
        return issues;
    }

    validateTaskLogic(task) {
        const warnings = [];
        
        // Check for logical inconsistencies
        if (task.repeat === 'Daily' && task.timesPerWeek) {
            warnings.push('Daily task has timesPerWeek setting');
        }
        
        if (task.repeat === 'Weekly' && task.timesPerDay) {
            warnings.push('Weekly task has timesPerDay setting');
        }
        
        if (task.repeat === 'Monthly' && (task.timesPerDay || task.timesPerWeek)) {
            warnings.push('Monthly task has daily/weekly settings');
        }
        
        // Check for unusual configurations
        if (task.timesPerDay && task.timesPerDay > 10) {
            warnings.push(`Very high timesPerDay: ${task.timesPerDay}`);
        }
        
        if (task.users && task.users.length > 20) {
            warnings.push(`Very large user list: ${task.users.length} users`);
        }
        
        // Check reward values
        if (task.reward) {
            const rewardValue = parseInt(task.reward);
            if (isNaN(rewardValue)) {
                warnings.push(`Non-numeric reward value: ${task.reward}`);
            } else if (rewardValue < 0) {
                warnings.push(`Negative reward value: ${task.reward}`);
            } else if (rewardValue > 1000) {
                warnings.push(`Very high reward value: ${task.reward}`);
            }
        }
        
        return warnings;
    }

    async validateAdmin(admin) {
        const adminEmail = admin.email;
        this.log(`Validating admin: ${adminEmail}`);
        
        if (!admin.tasks || !Array.isArray(admin.tasks)) {
            this.log(`Admin ${adminEmail} has no tasks or invalid tasks array`, 'warning');
            return;
        }
        
        let adminValidTasks = 0;
        let adminInvalidTasks = 0;
        
        for (let i = 0; i < admin.tasks.length; i++) {
            const task = admin.tasks[i];
            this.results.totalTasks++;
            
            // Validate structure
            const structureIssues = this.validateTaskStructure(task, adminEmail);
            
            // Validate logic
            const logicWarnings = this.validateTaskLogic(task);
            
            if (structureIssues.length === 0) {
                this.results.validTasks++;
                adminValidTasks++;
                
                if (logicWarnings.length > 0) {
                    this.log(`Task "${task.title}" has warnings: ${logicWarnings.join(', ')}`, 'warning');
                }
            } else {
                this.results.invalidTasks++;
                adminInvalidTasks++;
                
                const issueReport = {
                    admin: adminEmail,
                    taskIndex: i,
                    taskTitle: task.title || 'Unnamed',
                    issues: structureIssues,
                    warnings: logicWarnings
                };
                
                this.results.issues.push(issueReport);
                this.log(`Invalid task "${task.title || 'Unnamed'}": ${structureIssues.join(', ')}`, 'error');
            }
        }
        
        this.log(`Admin ${adminEmail}: ${adminValidTasks} valid, ${adminInvalidTasks} invalid tasks`);
    }

    generateRecommendations() {
        const recommendations = [];
        
        if (this.results.invalidTasks > 0) {
            recommendations.push('🔧 Fix invalid tasks before enabling new exception features');
            recommendations.push('📧 Contact users with invalid tasks for data correction');
        }
        
        if (this.results.totalTasks > 10000) {
            recommendations.push('⚡ Consider database indexing for large task collections');
        }
        
        const errorRate = (this.results.invalidTasks / this.results.totalTasks) * 100;
        if (errorRate > 5) {
            recommendations.push('⚠️  High error rate detected - consider data cleanup');
        } else if (errorRate > 1) {
            recommendations.push('📊 Monitor task creation validation more closely');
        } else {
            recommendations.push('✅ Task data quality is excellent');
        }
        
        // Check for exception system compatibility
        const tasksWithExceptions = this.results.issues.filter(issue => 
            issue.issues.some(i => i.includes('exceptions'))
        ).length;
        
        if (tasksWithExceptions > 0) {
            recommendations.push('🔄 Some tasks have invalid exception data - may need cleanup');
        } else {
            recommendations.push('✅ All tasks are compatible with the new exception system');
        }
        
        this.results.recommendations = recommendations;
    }

    printReport() {
        this.log('\n📊 Task Validation Report');
        this.log('========================\n');
        
        this.log(`Total Tasks: ${this.results.totalTasks}`);
        this.log(`Valid Tasks: ${this.results.validTasks}`, 'success');
        this.log(`Invalid Tasks: ${this.results.invalidTasks}`, this.results.invalidTasks > 0 ? 'error' : 'success');
        
        const successRate = ((this.results.validTasks / this.results.totalTasks) * 100).toFixed(1);
        this.log(`Success Rate: ${successRate}%\n`);
        
        if (this.results.issues.length > 0) {
            this.log('🔍 Issues Found:', 'warning');
            this.results.issues.forEach((issue, index) => {
                this.log(`\n${index + 1}. Admin: ${issue.admin}`);
                this.log(`   Task: "${issue.taskTitle}" (index ${issue.taskIndex})`);
                this.log(`   Issues: ${issue.issues.join(', ')}`);
                if (issue.warnings.length > 0) {
                    this.log(`   Warnings: ${issue.warnings.join(', ')}`);
                }
            });
        }
        
        this.log('\n💡 Recommendations:');
        this.results.recommendations.forEach(rec => this.log(`   ${rec}`));
        
        this.log('\n🎯 Exception System Compatibility:');
        if (this.results.invalidTasks === 0) {
            this.log('   ✅ All tasks are compatible with the new exception system', 'success');
            this.log('   ✅ No migration required', 'success');
            this.log('   ✅ Safe to deploy immediately', 'success');
        } else {
            this.log('   ⚠️  Some tasks may need fixing before full feature deployment', 'warning');
            this.log('   📋 Review invalid tasks listed above', 'warning');
        }
    }

    async run() {
        try {
            this.log('🚀 Starting task validation...');
            
            const db = await connectDB();
            const admins = db.collection('admins');
            
            const adminsCursor = admins.find({});
            let adminCount = 0;
            
            for await (const admin of adminsCursor) {
                adminCount++;
                await this.validateAdmin(admin);
            }
            
            this.log(`\n📈 Processed ${adminCount} admins with ${this.results.totalTasks} total tasks`);
            
            this.generateRecommendations();
            this.printReport();
            
            return {
                success: this.results.invalidTasks === 0,
                results: this.results
            };
            
        } catch (error) {
            this.log(`❌ Validation failed: ${error.message}`, 'error');
            throw error;
        }
    }
}

// Export for use as module
module.exports = TaskValidator;

// Run validation if executed directly
if (require.main === module) {
    const validator = new TaskValidator();
    
    validator.run()
        .then(result => {
            if (result.success) {
                console.log('\n🎉 All tasks are valid and compatible!');
                process.exit(0);
            } else {
                console.log('\n⚠️  Some issues found. Review the report above.');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\n💥 Validation script failed:', error.message);
            process.exit(1);
        });
}