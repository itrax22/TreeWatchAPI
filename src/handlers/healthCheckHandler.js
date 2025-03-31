const HealthCheckRepository = require('../DAL/repositories/healthCheckRepository');
const HealthCheck = require('../DAL/models/healthCheck');

/**
 * Get health check records with filtering and pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getHealthChecks = async (req, res) => {
    try {
        const { 
            page = 1, 
            pageSize = 10,
            jobName,
            status,
            fromDate,
            toDate,
            sortBy = 'startTime',
            sortDirection = 'desc'
        } = req.query;

        const healthChecks = await HealthCheckRepository.getHealthChecks({
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            jobName,
            status,
            fromDate, 
            toDate,
            sortBy,
            sortDirection
        });

        res.status(200).json(healthChecks);
    } catch (error) {
        console.error('Error getting health checks:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve health checks',
            error: error.message
        });
    }
};

/**
 * Get system health statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getHealthStats = async (req, res) => {
    try {
        const stats = await HealthCheckRepository.getHealthStats();
        res.status(200).json(stats);
    } catch (error) {
        console.error('Error getting health statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve health statistics',
            error: error.message
        });
    }
};

/**
 * Get latest health check for each job
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getLatestHealthChecks = async (req, res) => {
    try {
        const latestChecks = await HealthCheckRepository.getLatestHealthChecks();
        res.status(200).json(latestChecks);
    } catch (error) {
        console.error('Error getting latest health checks:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve latest health checks',
            error: error.message
        });
    }
};

/**
 * Get specific health check by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getHealthCheckById = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Health check ID is required'
            });
        }

        const healthCheck = await HealthCheckRepository.getById(id);
        
        if (!healthCheck) {
            return res.status(404).json({
                success: false,
                message: `Health check with ID ${id} not found`
            });
        }

        res.status(200).json(healthCheck);
    } catch (error) {
        console.error(`Error getting health check ${req.params.id}:`, error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve health check',
            error: error.message
        });
    }
};