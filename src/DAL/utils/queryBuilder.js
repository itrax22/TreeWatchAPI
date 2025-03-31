const { Datastore, PropertyFilter } = require('@google-cloud/datastore');

/**
 * QueryBuilder class for constructing Google Cloud Datastore queries
 * @class QueryBuilder
 */
class QueryBuilder {
    /**
     * Creates a new QueryBuilder instance
     * @param {Datastore} datastore - Google Cloud Datastore instance
     * @param {string} kind - The entity kind to query
     * @throws {Error} If datastore or kind is not provided
     */
    constructor(datastore, kind) {
        if (!datastore) {
            throw new Error('Datastore instance is required');
        }
        if (!kind) {
            throw new Error('Entity kind is required');
        }

        this.datastore = datastore;
        this.kind = kind;
        this.query = datastore.createQuery(kind);
        this.filters = [];
    }

    /**
     * Adds a filter to the query
     * @param {string} field - The field to filter on
     * @param {string} operator - The comparison operator
     * @param {*} value - The value to compare against
     * @returns {QueryBuilder} The current QueryBuilder instance
     * @throws {Error} If field or operator is not provided
     */
    addFilter(field, operator, value) {
        if (!field) {
            throw new Error('Field is required for filter');
        }
        if (!operator) {
            throw new Error('Operator is required for filter');
        }

        if (value !== undefined && value !== null && value !== '') {
            this.filters.push(new PropertyFilter(field, operator, value));
        }
        return this;
    }

    /**
     * Adds a text equality filter to the query
     * @param {string} field - The field to filter on
     * @param {string} value - The value to compare against
     * @returns {QueryBuilder} The current QueryBuilder instance
     */
    addTextFilter(field, value) {
        if (value) {
            return this.addFilter(field, '=', value);
        }
        return this;
    }

    /**
     * Adds sorting to the query
     * @param {string} field - The field to sort by
     * @param {boolean} [descending=false] - Whether to sort in descending order
     * @returns {QueryBuilder} The current QueryBuilder instance
     * @throws {Error} If field is not provided
     */
    addSort(field, descending = false) {
        if (!field) {
            throw new Error('Field is required for sorting');
        }

        this.query = this.query.order(field, { descending });
        return this;
    }

    /**
     * Adds a limit to the query
     * @param {number} limit - The maximum number of results to return
     * @returns {QueryBuilder} The current QueryBuilder instance
     */
    limit(limit) {
        if (typeof limit === 'number' && limit > 0) {
            this.query = this.query.limit(limit);
        }
        return this;
    }

    /**
     * Adds an offset to the query
     * @param {number} offset - The number of results to skip
     * @returns {QueryBuilder} The current QueryBuilder instance
     */
    offset(offset) {
        if (typeof offset === 'number' && offset >= 0) {
            this.query = this.query.offset(offset);
        }
        return this;
    }

    /**
     * Adds select fields to the query
     * @param {...string} fields - The fields to select
     * @returns {QueryBuilder} The current QueryBuilder instance
     */
    select(...fields) {
        if (fields.length > 0) {
            this.query = this.query.select(fields);
        }
        return this;
    }

    /**
     * Adds group by fields to the query
     * @param {...string} fields - The fields to group by
     * @returns {QueryBuilder} The current QueryBuilder instance
     */
    groupBy(...fields) {
        if (fields.length > 0) {
            this.query = this.query.groupBy(fields);
        }
        return this;
    }

    /**
     * Builds and returns the final query
     * @returns {Query} The constructed query
     */
    build() {
        // Apply all filters to the query
        this.filters.forEach(filter => {
            this.query = this.query.filter(filter);
        });
        return this.query;
    }

    /**
     * Creates an aggregation query for counting results
     * @returns {AggregationQuery} The aggregation query
     */
    buildCount() {
        return this.datastore.createAggregationQuery(this.build());
    }
}

module.exports = QueryBuilder;