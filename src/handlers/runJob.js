const { RechovotLauncher } = require('../BL/rechovot/launch');
const { PetahTikvaLauncher } = require('../BL/petahTikva/petahTikvaLauncher');
const { RishonLauncher } = require('../BL/rishon/rishonLauncher');
const { GivatayimLauncher } = require('../BL/givatayim/givatayimLauncher');
const { AshdodLauncher } = require('../BL/ashdod/ashdodLauncher');
const { NetanyaLauncher } = require('../BL/netanya/netanyaLauncher');
const HealthCheck = require('../DAL/models/healthCheck');
const HealthCheckRepository = require('../DAL/repositories/healthCheckRepository');

/**
 * Run a specific job with health monitoring
 * @param {string} jobName - Name of the job to run
 * @param {string} mode - Environment mode
 * @returns {Object} - Result of the job execution
 */
async function runSingleJob(jobName, mode) {
    // Create health check record for this job
    const healthCheck = HealthCheck.forJob(jobName);
    const { id } = await HealthCheckRepository.insert(healthCheck);
    
    let launcher;
    switch (jobName) {
        case 'rechovot':
            launcher = new RechovotLauncher();
            break;
        case 'petah-tikva':
            launcher = new PetahTikvaLauncher();
            break;
        case 'rishon':
            launcher = new RishonLauncher();
            break;
        case 'givatayim':
            launcher = new GivatayimLauncher();
            break;
        case 'ashdod':
            launcher = new AshdodLauncher();
            break;
        case 'netanya':
            launcher = new NetanyaLauncher();
            break;
        default:
            throw new Error(`Unknown job name: ${jobName}`);
    }
    
    try {
        console.log(`Starting ${jobName} job in ${mode} mode`);
        const result = await launcher.launch(mode);
        
        // Update health check record on success
        await HealthCheckRepository.update(id, healthCheck.markSuccess({
            result,
            mode
        }));
        
        return {
            success: true,
            jobName,
            message: `${jobName} job completed successfully`
        };
    } catch (error) {
        console.error(`Error running ${jobName} job:`, error);
        
        // Update health check record on failure
        await HealthCheckRepository.update(id, healthCheck.markFailed(error, {
            mode
        }));
        
        return {
            success: false,
            jobName,
            error: error.message
        };
    }
}

/**
 * Run a single job by name
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.runSingleJob = async (req, res) => {
    try {
        const { jobName } = req.params;
        const mode = process.env.NODE_ENV || 'production';
        
        if (!jobName) {
            return res.status(400).json({
                success: false,
                message: 'Job name is required'
            });
        }
        
        const result = await runSingleJob(jobName, mode);
        
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to run job',
            error: error.message
        });
    }
};

/**
 * Run all jobs with health monitoring
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.runJob = async (req, res) => {
    try {
        const mode = process.env.NODE_ENV || 'production';
        const jobs = [
            'rechovot',
            'petah-tikva',
            'rishon',
            'givatayim',
            'ashdod',
            'netanya'
        ];
        
        // Create overall job health check
        const overallHealthCheck = HealthCheck.forJob('all-jobs');
        const { id: overallId } = await HealthCheckRepository.insert(overallHealthCheck);
        
        // Run all jobs and collect results
        const results = [];
        let hasFailures = false;
        
        for (const jobName of jobs) {
            try {
                const result = await runSingleJob(jobName, mode);
                results.push(result);
                if (!result.success) {
                    hasFailures = true;
                }
            } catch (error) {
                console.error(`Error in job ${jobName}:`, error);
                results.push({
                    success: false,
                    jobName,
                    error: error.message
                });
                hasFailures = true;
            }
        }
        
        // Update overall health check status
        if (hasFailures) {
            await HealthCheckRepository.update(overallId, overallHealthCheck.markFailed(
                'One or more jobs failed', 
                { results, mode }
            ));
            
            res.status(207).json({
                success: false,
                message: 'Some jobs failed',
                results
            });
        } else {
            await HealthCheckRepository.update(overallId, overallHealthCheck.markSuccess({ 
                results, 
                mode 
            }));
            
            res.status(200).json({
                success: true,
                message: 'All jobs launched successfully',
                results
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to launch jobs',
            error: error.message
        });
    }
};