const TreePermitRepository = require('../DAL/repositories/treePermitRepository');
const QUERY_CONSTANTS = require('../constants').constants.QUERY_CONSTANTS;

const MAX_PAGE_SIZE = 50;

/**
 * Handles GET requests to fetch TreePermits with sorting and pagination.
 * @param {object} req - The HTTP request object.
 * @param {object} res - The HTTP response object.
 */
exports.getTreePermits = async (req, res) => {
    try {
        const {
            page = QUERY_CONSTANTS.DEFAULT_PAGE,
            pageSize = QUERY_CONSTANTS.DEFAULT_PAGE_SIZE,
            sortBy = QUERY_CONSTANTS.DEFAULT_SORT_FIELD,
            settlementName,
            reason,
            licenseType
        } = req.query;

        // Validation
        const errors = [];
        
        if (parseInt(pageSize, 10) > QUERY_CONSTANTS.MAX_PAGE_SIZE) {
            errors.push(`Page size cannot exceed ${QUERY_CONSTANTS.MAX_PAGE_SIZE}`);
        }

        if (sortBy && !QUERY_CONSTANTS.VALID_SORT_FIELDS.includes(sortBy)) {
            errors.push(`Invalid sortBy value. Must be one of: ${QUERY_CONSTANTS.VALID_SORT_FIELDS.join(', ')}`);
        }

        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        // Get results
        const results = await TreePermitRepository.getTreePermits({
            page: parseInt(page, 10),
            pageSize: parseInt(pageSize, 10),
            sortBy,
            filters: {
                settlementName,
                reason,
                licenseType
            }
        });

        return res.status(200).json(results);
    } catch (error) {
        console.error('Error fetching TreePermits:', error);
        return res.status(500).json({
            error: 'Internal Server Error'
        });
    }
};


