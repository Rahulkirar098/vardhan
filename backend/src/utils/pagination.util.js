/**
 * Standard Pagination Utility for Nuvince SaaS API
 */

/**
 * Parses and sanitizes pagination parameters from an Express request query.
 *
 * @param {Object} query - req.query object (e.g. { page: '2', limit: '25' })
 * @param {Object} [options] - Optional settings
 * @param {number} [options.defaultPage=1] - Default page number (1-based)
 * @param {number} [options.defaultLimit=10] - Default limit per page
 * @param {number} [options.maxLimit=100] - Maximum allowed limit per page
 * @returns {{ page: number, limit: number, skip: number }}
 */
const parsePagination = (query = {}, options = {}) => {
    const defaultPage = options.defaultPage || 1;
    const defaultLimit = options.defaultLimit || 10;
    const maxLimit = options.maxLimit || 100;

    const parsedPage = parseInt(query.page, 10);
    const page = !isNaN(parsedPage) && parsedPage > 0 ? parsedPage : defaultPage;

    const parsedLimit = parseInt(query.limit, 10);
    const limit = !isNaN(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, maxLimit)
        : defaultLimit;

    const skip = (page - 1) * limit;

    return { page, limit, skip };
};

/**
 * Builds a standardized pagination metadata object.
 *
 * @param {number} total - Total number of matching documents
 * @param {number} page - Current 1-based page number
 * @param {number} limit - Number of items per page
 * @returns {{ total: number, page: number, limit: number, totalPages: number, hasNextPage: boolean, hasPrevPage: boolean }}
 */
const buildPaginationMeta = (total = 0, page = 1, limit = 10) => {
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;
    return {
        total,
        page,
        limit,
        totalPages: totalPages || (total === 0 ? 0 : 1),
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
    };
};

/**
 * Executes a paginated Mongoose query.
 *
 * @param {import('mongoose').Model} model - The Mongoose Model
 * @param {Object} filter - MongoDB query filter
 * @param {Object} [options] - Pagination and query options
 * @param {number} [options.page=1]
 * @param {number} [options.limit=10]
 * @param {number} [options.maxLimit=100]
 * @param {Object|string} [options.sort={ createdAt: -1 }]
 * @param {string|Object} [options.select]
 * @param {Array|string|Object} [options.populate]
 * @param {boolean} [options.lean=true]
 * @returns {Promise<{ data: Array, total: number, page: number, limit: number, totalPages: number, hasNextPage: boolean, hasPrevPage: boolean, pagination: Object }>}
 */
const paginateQuery = async (model, filter = {}, options = {}) => {
    const { page, limit, skip } = parsePagination(options, {
        defaultPage: options.page || 1,
        defaultLimit: options.limit || 10,
        maxLimit: options.maxLimit || 100,
    });

    let query = model.find(filter);

    if (options.select) {
        query = query.select(options.select);
    }

    if (options.populate) {
        if (Array.isArray(options.populate)) {
            for (const pop of options.populate) {
                query = query.populate(pop);
            }
        } else {
            query = query.populate(options.populate);
        }
    }

    if (options.sort) {
        query = query.sort(options.sort);
    } else {
        query = query.sort({ createdAt: -1 });
    }

    query = query.skip(skip).limit(limit);

    if (options.lean !== false) {
        query = query.lean();
    }

    const [data, total] = await Promise.all([
        query.exec(),
        model.countDocuments(filter),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);

    return {
        data,
        ...pagination,
        pagination,
    };
};

module.exports = {
    parsePagination,
    buildPaginationMeta,
    paginateQuery,
};
