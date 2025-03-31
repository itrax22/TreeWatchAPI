const { Datastore } = require('@google-cloud/datastore');
const QueryBuilder = require('../utils/queryBuilder');

const projectId = process.env.PROJECT_ID || 'treewatchapi';
const datastore = new Datastore({projectId: projectId});

const KIND = 'HealthCheck';

class HealthCheckRepository {
    /**
     * Inserts a new health check record
     * @param {Object} healthCheck - Health check data
     * @returns {Object} - Result of the operation
     */
    static async insert(healthCheck) {
        const key = datastore.key([KIND]);
        const entity = {
            key,
            data: {
                ...healthCheck,
                recordCreatedAt: new Date().toISOString(),
            },
        };

        try {
            await datastore.save(entity);
            return {
                success: true,
                id: key.id || key.name,
                message: `Health check record created with key: ${key.id || key.name}`
            };
        } catch (error) {
            console.error('Failed to insert health check record:', error);
            return {
                success: false,
                message: 'Failed to insert health check record',
                error: error.message
            };
        }
    }

    /**
     * Updates an existing health check record
     * @param {string} id - Record ID
     * @param {Object} updates - Fields to update
     * @returns {Object} - Result of the operation
     */
    static async update(id, updates) {
        const key = datastore.key([KIND, datastore.int(id)]);
        
        try {
            // Get the existing entity
            const [entity] = await datastore.get(key);
            
            if (!entity) {
                return {
                    success: false,
                    message: `Health check record with ID ${id} not found`
                };
            }

            // Apply updates
            const updatedEntity = {
                key,
                data: {
                    ...entity,
                    ...updates,
                    lastUpdatedAt: new Date().toISOString()
                },
            };

            await datastore.update(updatedEntity);
            return {
                success: true,
                message: `Health check record ${id} updated successfully`
            };
        } catch (error) {
            console.error(`Failed to update health check record ${id}:`, error);
            return {
                success: false,
                message: `Failed to update health check record ${id}`,
                error: error.message
            };
        }
    }

    /**
     * Retrieves health check records with pagination and filtering
     * @param {Object} options - Query options
     * @returns {Object} - Query results and metadata
     */
    static async getHealthChecks({ 
        page = 1, 
        pageSize = 10, 
        jobName = null,
        status = null,
        fromDate = null,
        toDate = null,
        sortBy = 'startTime',
        sortDirection = 'desc'
    } = {}) {
        const offset = (page - 1) * pageSize;
        const queryBuilder = new QueryBuilder(datastore, KIND);

        // Apply filters
        if (jobName) {
            queryBuilder.addFilter('jobName', '=', jobName);
        }
        
        if (status) {
            queryBuilder.addFilter('status', '=', status);
        }
        
        if (fromDate) {
            const fromDateObj = new Date(fromDate);
            queryBuilder.addFilter('startTime', '>=', fromDateObj.toISOString());
        }
        
        if (toDate) {
            const toDateObj = new Date(toDate);
            queryBuilder.addFilter('startTime', '<=', toDateObj.toISOString());
        }

        // Apply sorting
        const isDescending = sortDirection.toLowerCase() === 'desc';
        switch (sortBy) {
            case 'jobName':
                queryBuilder.addSort('jobName', !isDescending);
                break;
            case 'status':
                queryBuilder.addSort('status', !isDescending);
                break;
            case 'endTime':
                queryBuilder.addSort('endTime', isDescending);
                break;
            case 'recordCreatedAt':
                queryBuilder.addSort('recordCreatedAt', isDescending);
                break;
            case 'startTime':
            default:
                queryBuilder.addSort('startTime', isDescending);
                break;
        }

        // Build the query
        const query = queryBuilder.build();

        // Run the aggregation query to get the total count
        const aggregatedQuery = await datastore.createAggregationQuery(query);
        const [totalCountResult] = await datastore.runAggregationQuery(aggregatedQuery.count()) || [0];
        const totalCount = totalCountResult[0].property_1 || 0;

        // Apply pagination
        query.limit(pageSize).offset(offset);

        // Fetch the paginated results
        const [entities] = await datastore.runQuery(query);

        // Transform results for output
        const results = entities.map((entity) => ({
            id: entity[datastore.KEY].id,
            ...entity,
        }));

        return {
            data: results,
            metadata: {
                currentPage: page,
                pageSize,
                totalCount,
                totalPages: Math.ceil(totalCount / pageSize),
            },
        };
    }

    /**
     * Gets the most recent health check for each job
     * @returns {Array} - Array of most recent health checks
     */
    static async getLatestHealthChecks() {
        try {
            // Get distinct job names
            const jobNameQuery = datastore.createQuery(KIND)
                .select('jobName')
                .groupBy('jobName');
            
            const [jobEntities] = await datastore.runQuery(jobNameQuery);
            const jobNames = [...new Set(jobEntities.map(entity => entity.jobName))].filter(Boolean);
            
            // Get the latest record for each job
            const latestRecords = [];
            
            for (const jobName of jobNames) {
                const query = datastore.createQuery(KIND)
                    .filter('jobName', '=', jobName)
                    .order('startTime', {descending: true})
                    .limit(1);
                
                const [records] = await datastore.runQuery(query);
                
                if (records.length > 0) {
                    latestRecords.push({
                        id: records[0][datastore.KEY].id,
                        ...records[0]
                    });
                }
            }
            
            return latestRecords;
        } catch (error) {
            console.error('Failed to get latest health checks:', error);
            throw error;
        }
    }

    /**
     * Gets a single health check by ID
     * @param {string} id - Record ID
     * @returns {Object} - Health check record
     */
    static async getById(id) {
        try {
            const key = datastore.key([KIND, datastore.int(id)]);
            const [entity] = await datastore.get(key);
            
            if (!entity) {
                return null;
            }
            
            return {
                id: entity[datastore.KEY].id,
                ...entity
            };
        } catch (error) {
            console.error(`Failed to get health check with ID ${id}:`, error);
            throw error;
        }
    }

    /**
     * Gets statistics about job health
     * @returns {Object} - Health statistics
     */
    static async getHealthStats() {
        try {
            // Get the latest health check for each job
            const latestHealthChecks = await this.getLatestHealthChecks();
            
            // Calculate health status
            const stats = {
                totalJobs: latestHealthChecks.length,
                successfulJobs: 0,
                failedJobs: 0,
                pendingJobs: 0,
                runningJobs: 0,
                lastUpdated: null,
                healthScore: 0,
                jobsStatus: {}
            };
            
            let latestTimestamp = null;
            
            latestHealthChecks.forEach(check => {
                // Update counters
                if (check.status === 'success') stats.successfulJobs++;
                else if (check.status === 'failed') stats.failedJobs++;
                else if (check.status === 'pending') stats.pendingJobs++;
                else if (check.status === 'running') stats.runningJobs++;
                
                // Track the most recent update across all jobs
                const checkTime = check.endTime || check.startTime;
                if (!latestTimestamp || new Date(checkTime) > new Date(latestTimestamp)) {
                    latestTimestamp = checkTime;
                }
                
                // Add to job status map
                stats.jobsStatus[check.jobName] = {
                    status: check.status,
                    lastRun: check.startTime,
                    completedAt: check.endTime,
                    error: check.error
                };
            });
            
            // Calculate health score (percentage of successful jobs)
            stats.healthScore = stats.totalJobs > 0 ? 
                Math.round((stats.successfulJobs / stats.totalJobs) * 100) : 0;
            
            stats.lastUpdated = latestTimestamp;
            
            return stats;
        } catch (error) {
            console.error('Failed to get health statistics:', error);
            throw error;
        }
    }
}

module.exports = HealthCheckRepository;