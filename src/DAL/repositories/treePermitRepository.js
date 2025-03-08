const { Datastore } = require('@google-cloud/datastore');
const QueryBuilder = require('../utils/queryBuilder');

const projectId = 'treewatchapi';
const datastore = new Datastore({projectId: projectId});

const KIND = 'TreePermit';

class TreePermitRepository {
    static async insert(treePermit) {
        const { settlement, resourceId } = treePermit;

        const query = new QueryBuilder(datastore, KIND)
            .addFilter('settlement', '=', settlement)
            .addFilter('resourceId', '=', resourceId)
            .build()
            .limit(1);

        const [existingPermits] = await datastore.runQuery(query);

        if (existingPermits.length > 0) {
            console.warn(`Resource ID ${resourceId} already exists for settlement ${settlement}`);
            return;
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
        return `Entity created with key: ${key.id || key.name}`;
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

    // Method to get distinct values for a field (useful for dropdowns)
    static async getDistinctValues(field) {
        const query = datastore.createQuery(KIND)
            .select(field)
            .groupBy(field);

        const [entities] = await datastore.runQuery(query);
        return [...new Set(entities.map(entity => entity[field]))].filter(Boolean);
    }
}

module.exports = TreePermitRepository;