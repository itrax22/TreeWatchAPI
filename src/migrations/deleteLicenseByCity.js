/**
 * Migration: Remove All Tree Permits for פתח תקווה
 * 
 * This migration script removes all tree permits from Datastore
 * where the settlement is "פתח תקווה".
 */

const { Datastore } = require('@google-cloud/datastore');

// Initialize Datastore
const projectId = 'treewatchapi';
const datastore = new Datastore({ projectId });

const KIND = 'TreePermit';
const CITY_TO_DELETE = 'פתח תקווה';

async function deletePermitsForCity() {
    console.log(`MIGRATION: Starting removal of tree permits for city: ${CITY_TO_DELETE}...`);
    
    // Create a query to get all tree permits for the specified city
    const query = datastore.createQuery(KIND)
        .filter('settlement', '=', CITY_TO_DELETE);
    
    try {
        // Get all matching permits
        const [entities] = await datastore.runQuery(query);
        console.log(`Found ${entities.length} permits for city: ${CITY_TO_DELETE}`);
        
        if (entities.length === 0) {
            console.log(`No permits found for ${CITY_TO_DELETE}. Migration completed.`);
            return { deleted: 0, status: 'success' };
        }
        
        // Create array of keys to delete
        const keysToDelete = entities.map(permit => {
            const key = permit[datastore.KEY];
            const permitId = key.id || key.name;
            
            // Log info about each permit being deleted
            console.log(`Will delete permit ID: ${permitId}, resource ID: ${permit.resourceId}, license type: ${permit.licenseType}`);
            return key;
        });
        
        // Delete the entities in batches if there are many
        const BATCH_SIZE = 500; // Google Cloud Datastore has limitations on batch operations
        
        if (keysToDelete.length <= BATCH_SIZE) {
            // Delete all at once if under batch size limit
            await datastore.delete(keysToDelete);
        } else {
            // Delete in batches
            for (let i = 0; i < keysToDelete.length; i += BATCH_SIZE) {
                const batch = keysToDelete.slice(i, i + BATCH_SIZE);
                console.log(`Deleting batch ${i/BATCH_SIZE + 1} of ${Math.ceil(keysToDelete.length/BATCH_SIZE)}...`);
                await datastore.delete(batch);
            }
        }
        
        console.log(`MIGRATION COMPLETE: Successfully deleted ${keysToDelete.length} permits for city: ${CITY_TO_DELETE}`);
        return { deleted: keysToDelete.length, status: 'success' };
    } catch (error) {
        console.error('MIGRATION FAILED:', error);
        return { status: 'error', error: error.message };
    }
}

// Add a confirmation prompt when running as a script
async function confirmAndRun() {
    if (process.env.SKIP_CONFIRMATION === 'true') {
        return deletePermitsForCity();
    }
    
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise((resolve) => {
        readline.question(`WARNING: This will permanently delete ALL tree permits for ${CITY_TO_DELETE}. Are you sure? (yes/no): `, async (answer) => {
            readline.close();
            
            if (answer.toLowerCase() === 'yes') {
                console.log('Proceeding with deletion...');
                const result = await deletePermitsForCity();
                resolve(result);
            } else {
                console.log('Operation cancelled by user.');
                resolve({ deleted: 0, status: 'cancelled' });
            }
        });
    });
}

// Self-execute the migration
if (require.main === module) {
    confirmAndRun()
        .then(result => {
            console.log('Migration result:', result);
            process.exit(result.status === 'success' || result.status === 'cancelled' ? 0 : 1);
        })
        .catch(error => {
            console.error('Unhandled error during migration:', error);
            process.exit(1);
        });
} else {
    // Export for potential programmatic use
    module.exports = { 
        deletePermitsForCity,
        confirmAndRun
    };
}