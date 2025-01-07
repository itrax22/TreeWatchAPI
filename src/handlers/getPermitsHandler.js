const TreePermitRepository = require('../DAL/repositories/treePermitRepository');

const MAX_PAGE_SIZE = 50;

/**
 * Handles GET requests to fetch TreePermits with sorting and pagination.
 * @param {object} req - The HTTP request object.
 * @param {object} res - The HTTP response object.
 */
exports.getTreePermits = async (req, res) => {
    try {
        const {
            page = 1, // Default to the first page
            pageSize = 20, // Default page size
            sortBy = 'createDate', // Default sort field
        } = req.query;

        if (pageSize > MAX_PAGE_SIZE) {
            return res.status(400).json({
                error: `Page size cannot exceed ${MAX_PAGE_SIZE}`,
            });
        }

        const validSortFields = ['createDate', 'city', 'licenseDate', 'lastDateToObject'];
        if (!validSortFields.includes(sortBy)) {
            return res.status(400).json({
                error: `Invalid sortBy value. Must be one of: ${validSortFields.join(', ')}`,
            });
        }

        const results = await TreePermitRepository.getTreePermits({
            page: parseInt(page, 10),
            pageSize: parseInt(pageSize, 10),
            sortBy,
        });

        return res.status(200).json(results);
    } catch (error) {
        console.error('Error fetching TreePermits:', error);
        return res.status(500).json({
            error: 'Internal Server Error',
        });
    }
};

