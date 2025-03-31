/**
 * Migration: Delete All Tree Permits from Last 200 Days
 * 
 * This migration script removes all tree permits from Datastore
 * that were created within the last 200 days.
 */

const { Datastore } = require('@google-cloud/datastore');

// Initialize Datastore
const projectId = 'treewatchapi';
const datastore = new Datastore({ projectId });

const KIND = 'TreePermit';
const DAYS_TO_DELETE = 200;

async function deleteRecentPermits() {
    console.log(`MIGRATION: Starting removal of tree permits from the last ${DAYS_TO_DELETE} days...`);
    
    // Calculate the date threshold (200 days ago)
    const now = new Date();
    const cutoffDate = new Date(now);
    cutoffDate.setDate(now.getDate() - DAYS_TO_DELETE);
    
    console.log(`Deleting permits created on or after: ${cutoffDate.toISOString()}`);
    
    // Create a query to get all tree permits with licenseDate newer than the cutoff date
    const query = datastore.createQuery(KIND)
        .filter('dates.licenseDate', '>=', cutoffDate);
    
    try {
        // Get all matching permits
        const [entities] = await datastore.runQuery(query);
        console.log(`Found ${entities.length} permits with license dates in the last ${DAYS_TO_DELETE} days`);
        
        if (entities.length === 0) {
            console.log(`No recent permits found. Migration completed.`);
            return { deleted: 0, status: 'success' };
        }
        
        // Create array of keys to delete
        const keysToDelete = entities.map(permit => {
            const key = permit[datastore.KEY];
            const permitId = key.id || key.name;
            
            // Log info about each permit being deleted
            console.log(`Will delete permit ID: ${permitId}, license date: ${permit.licenseDate}, resource ID: ${permit.resourceId}`);
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
                console.log(`Deleting batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(keysToDelete.length/BATCH_SIZE)}...`);
                await datastore.delete(batch);
            }
        }
        
        console.log(`MIGRATION COMPLETE: Successfully deleted ${keysToDelete.length} permits with license dates from the last ${DAYS_TO_DELETE} days`);
        return { deleted: keysToDelete.length, status: 'success' };
    } catch (error) {
        console.error('MIGRATION FAILED:', error);
        return { status: 'error', error: error.message };
    }
}

// Add a confirmation prompt when running as a script
async function confirmAndRun() {
    if (process.env.SKIP_CONFIRMATION === 'true') {
        return deleteRecentPermits();
    }
    
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise((resolve) => {
        readline.question(`WARNING: This will permanently delete ALL tree permits with license dates from the last ${DAYS_TO_DELETE} days. Are you sure? (yes/no): `, async (answer) => {
            readline.close();
            
            if (answer.toLowerCase() === 'yes') {
                console.log('Proceeding with deletion...');
                const result = await deleteRecentPermits();
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
        deleteRecentPermits,
        confirmAndRun
    };
}