/**
 * HealthCheck model representing a system health status entry
 */
class HealthCheck {
    constructor({
        id = null,
        jobName = '',
        status = 'pending',
        startTime = null,
        endTime = null,
        details = null,
        error = null
    } = {}) {
        this.id = id;
        this.jobName = jobName;
        this.status = status; // 'pending', 'running', 'success', 'failed'
        this.startTime = startTime || new Date().toISOString();
        this.endTime = endTime;
        this.details = details || {};
        this.error = error;
        this.recordCreatedAt = new Date().toISOString();
    }

    /**
     * Sets job as successful
     * @param {Object} details - Additional details about the job execution
     */
    markSuccess(details = {}) {
        this.status = 'success';
        this.endTime = new Date().toISOString();
        this.details = { ...this.details, ...details };
        return this;
    }

    /**
     * Sets job as failed
     * @param {Error|string} error - The error that occurred
     * @param {Object} details - Additional details about the error
     */
    markFailed(error, details = {}) {
        this.status = 'failed';
        this.endTime = new Date().toISOString();
        this.error = error instanceof Error ? error.message : error;
        this.details = { ...this.details, ...details };
        return this;
    }

    /**
     * Creates a new health check object for a job
     * @param {string} jobName - Name of the job
     * @returns {HealthCheck} - A new health check instance
     */
    static forJob(jobName) {
        return new HealthCheck({
            jobName,
            status: 'running',
            startTime: new Date().toISOString(),
            details: { initializedAt: new Date().toISOString() }
        });
    }
}

module.exports = HealthCheck;