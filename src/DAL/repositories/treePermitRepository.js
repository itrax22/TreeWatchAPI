const { Datastore } = require('@google-cloud/datastore');
const TreePermit = require('../models/treePermit');

// Initialize GCP Datastore
const projectId = 'treewatchapi'; // Replace with your actual project ID

const datastore = new Datastore({projectId: projectId});

const KIND = 'TreePermit';

class TreePermitRepository {
    /**
     * Inserts a new TreePermit into Datastore if the resourceId for the settlement is unique.
     * @param {TreePermit} treePermit - The TreePermit object to insert.
     * @returns {Promise<string>} - The inserted entity's key or error message.
     */
    static async insert(treePermit) {
        const { settlement, resourceId } = treePermit;

        // Check if the resourceId exists in the same settlement
        const query = datastore
            .createQuery(KIND)
            .filter('settlement', '=', settlement)
            .filter('resourceId', '=', resourceId)
            .limit(1);

        const [existingPermits] = await datastore.runQuery(query);

        if (existingPermits.length > 0) {
            console.warn(`Resource ID ${resourceId} already exists for settlement ${settlement}`);
            return;
        }

        // Create a new key for the entity
        const key = datastore.key([KIND]);

        // Prepare the entity
        const entity = {
            key,
            data: {
                ...treePermit,
                dates: treePermit.dates ? treePermit.dates : null, // Ensure dates are set properly
                recordCreatedAt: new Date().toISOString(),
            },
        };

        // Save the entity
        await datastore.save(entity);
        return `Entity created with key: ${key.id || key.name}`;
    }

    static async getTreePermits({ page, pageSize, sortBy }) {
        const offset = (page - 1) * pageSize;

        let query = datastore
            .createQuery(KIND)
            .limit(pageSize)
            .offset(offset);

        // Apply sorting
        switch (sortBy) {
            case 'createDate':
                query = query.order('recordCreatedAt', { descending: true });
                break;
            case 'city':
                query = query.order('settlement', { descending: false });
                break;
            case 'licenseDate':
                query = query.order('dates.licenseDate', { descending: true });
                break;
            case 'lastDateToObject':
                const today = new Date();
                query = query
                    .filter('dates.lastDateToObject', '>=', today.toISOString())
                    .order('dates.lastDateToObject', { descending: true });
                break;
        }

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
                totalCount: results.length,
            },
        };
    }
}

module.exports = TreePermitRepository;
