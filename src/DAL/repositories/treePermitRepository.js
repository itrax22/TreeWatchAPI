const { Datastore } = require('@google-cloud/datastore');
const QueryBuilder = require('../utils/queryBuilder');

const projectId = 'treewatchapi';
const datastore = new Datastore({projectId: projectId});

const KIND = 'TreePermit';

class TreePermitRepository {
    static async insert(treePermit) {
        const { settlement, resourceId } = treePermit;

        // Check if the license date is in the future
        if (treePermit.dates && treePermit.dates.licenseDate) {
            const licenseDate = new Date(treePermit.dates.licenseDate);
            const currentDate = new Date();
            
            if (licenseDate > currentDate) {
                console.warn(`License date for resource ID ${resourceId} is in the future. Insertion prevented.`);
                return {
                    success: false,
                    message: 'Cannot insert tree permit with a future license date'
                };
            }
        }

        const query = new QueryBuilder(datastore, KIND)
            .addFilter('settlement', '=', settlement)
            .addFilter('resourceId', '=', resourceId)
            .build()
            .limit(1);

        const [existingPermits] = await datastore.runQuery(query);

        if (existingPermits.length > 0) {
            console.warn(`Resource ID ${resourceId} already exists for settlement ${settlement}`);
            return {
                success: false,
                message: 'Resource ID already exists for this settlement'
            };
        }

        const key = datastore.key([KIND]);
        const entity = {
            key,
            data: {
                ...treePermit,
                dates: treePermit.dates ? treePermit.dates : null,
                recordCreatedAt: new Date().toISOString(),
            },
        };

        await datastore.save(entity);
        return {
            success: true,
            message: `Entity created with key: ${key.id || key.name}`
        };
    }

    static buildQueryFilters(params) {
        const queryBuilder = new QueryBuilder(datastore, KIND);

        // Add text filters
        if (params.settlementName) {
            queryBuilder.addFilter('settlement', '=', params.settlementName);
        }
        if (params.reason) {
            queryBuilder.addFilter('reasonShort', '=', params.reason);
        }
        if (params.licenseType) {
            queryBuilder.addFilter('licenseType', '=', params.licenseType);
        }

        // Add sorting
        switch (params.sortBy) {
            case 'createDate':
                queryBuilder.addSort('recordCreatedAt', true);
                break;
            case 'city':
                queryBuilder.addSort('settlement', false);
                break;
            case 'licenseDate':
                queryBuilder.addSort('dates.licenseDate', true);
                break;
            case 'lastDateToObject':
                const today = new Date();
                queryBuilder
                    .addFilter('dates.lastDateToObject', '>=', today)
                    .addSort('dates.lastDateToObject', true);
                break;
            default:
                queryBuilder.addSort('licenseDate', true);
                break;
        }
        return queryBuilder.build();
    }

    static async getTreePermits({ page, pageSize, sortBy, filters = {} }) {
        const offset = (page - 1) * pageSize;

        // Build the query with filters and sorting
        const query = this.buildQueryFilters({ 
            sortBy,
            ...filters
        });

        // Run the aggregation query to get the total count
        const aggregatedQuery = await datastore.createAggregationQuery(query);
        const [totalCountResult] = await datastore.runAggregationQuery(aggregatedQuery.count()) || [0];
        const totalCount = totalCountResult[0].property_1 || 0;

        // Apply pagination
        query.limit(pageSize).offset(offset);

        // Fetch the paginated results
        const [entities] = await datastore.runQuery(query);

        // Transform results for output
        const results = entities.map((entity) => {
            const permit = {
                id: entity[datastore.KEY].id,
                ...entity,
            };
            // Apply date formatting
            return this.formatPermitDates(permit);
        });

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

    // Method to get distinct values for a field (useful for dropdowns)
    static async getDistinctValues(field) {
        const query = datastore.createQuery(KIND)
            .select(field)
            .groupBy(field);

        const [entities] = await datastore.runQuery(query);
        return [...new Set(entities.map(entity => entity[field]))].filter(Boolean);
    }

    static formatPermitDates(permit) {
        const formattedPermit = { ...permit };
        
        if (formattedPermit.dates) {
            // Create a copy of the dates object
            const formattedDates = { ...formattedPermit.dates };
            
            // Format each date property that is a Date object and overwrite the original value
            const dateFields = ['startDate', 'endDate', 'licenseDate', 'printDate', 'lastDateToObject'];
            for (const field of dateFields) {
                if (formattedDates[field] instanceof Date) {
                    // Store the formatted date string, overwriting the Date object
                    formattedDates[field] = this.formatDateToEuropean(formattedDates[field]);
                }
            }
            
            formattedPermit.dates = formattedDates;
        }
        
        return formattedPermit;
    }

    static formatDateToEuropean(date) {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
            return null;
        }
        
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}/${month}/${year}`;
    }
}
module.exports = TreePermitRepository;