/**
 * Migration: Remove Tree Permits with Future License Dates
 * 
 * This migration script removes all tree permits from Datastore
 * where the license date is in the future.
 */

const { Datastore } = require('@google-cloud/datastore');
const PermitDates = require('../DAL/models/permitDates');

// Initialize Datastore
const projectId = 'treewatchapi';
const datastore = new Datastore({ projectId });

const KIND = 'TreePermit';

async function migrate() {
    console.log('MIGRATION: Starting removal of tree permits with future license dates...');
    
    // Current date for comparison
    const currentDate = new Date();
    console.log(`Current date: ${currentDate.toISOString()}`);
    
    // Create a query to get all tree permits
    const query = datastore.createQuery(KIND);
    
    try {
        // Get all permits
        const [entities] = await datastore.runQuery(query);
        console.log(`Found ${entities.length} total permits`);
        
        // Filter permits with future license dates
        const futurePermits = entities.filter(entity => {
            // Skip entities without dates
            if (!entity.dates || !entity.dates.licenseDate) {
                return false;
            }
            
            // Parse the license date
            let licenseDate;
            
            // Handle different date formats
            if (entity.dates.licenseDate instanceof Date) {
                licenseDate = entity.dates.licenseDate;
            } else {
                // Use the PermitDates parsing logic
                const tempDates = new PermitDates({
                    licenseDate: entity.dates.licenseDate
                });
                licenseDate = tempDates.licenseDate;
            }
            
            // Skip if we couldn't parse the date
            if (!licenseDate) {
                return false;
            }
            
            // Return true if license date is in the future
            return licenseDate > currentDate;
        });
        
        console.log(`Found ${futurePermits.length} permits with future license dates`);
        
        if (futurePermits.length === 0) {
            console.log('No future-dated permits to delete. Migration completed.');
            return { deleted: 0, status: 'success' };
        }
        
        // Create array of keys to delete
        const keysToDelete = futurePermits.map(permit => {
            const key = permit[datastore.KEY];
            const permitId = key.id || key.name;
            const licenseDate = permit.dates.licenseDate instanceof Date 
                ? permit.dates.licenseDate.toISOString() 
                : permit.dates.licenseDate;
                
            console.log(`Will delete permit ID: ${permitId}, license date: ${licenseDate}, settlement: ${permit.settlement}`);
            return key;
        });
        
        // Delete the entities
        await datastore.delete(keysToDelete);
        
        console.log(`MIGRATION COMPLETE: Successfully deleted ${keysToDelete.length} permits with future license dates`);
        return { deleted: keysToDelete.length, status: 'success' };
    } catch (error) {
        console.error('MIGRATION FAILED:', error);
        return { status: 'error', error: error.message };
    }
}

// Self-execute the migration
migrate()
    .then(result => {
        console.log('Migration result:', result);
        // Exit with appropriate code when running as a script
        if (require.main === module) {
            process.exit(result.status === 'success' ? 0 : 1);
        }
    })
    .catch(error => {
        console.error('Unhandled error during migration:', error);
        if (require.main === module) {
            process.exit(1);
        }
    });

// Export for potential programmatic use
module.exports = { migrate };