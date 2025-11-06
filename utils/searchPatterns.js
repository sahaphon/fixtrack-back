/**
 * Search Pattern Types for MySQL LIKE queries
 */
const SearchPatterns = {
    // Exact match
    EXACT: (value) => value,
    
    // Starts with (prefix search)
    STARTS_WITH: (value) => `${value}%`,
    
    // Ends with (suffix search)
    ENDS_WITH: (value) => `%${value}`,
    
    // Contains (full wildcard search)
    CONTAINS: (value) => `%${value}%`,
    
    // Case insensitive contains
    CONTAINS_CI: (value) => `%${value.toLowerCase()}%`
}

/**
 * Build WHERE clause with LIKE pattern
 * @param {string} column - Column name
 * @param {string} value - Search value
 * @param {function} pattern - Pattern function from SearchPatterns
 * @returns {string} WHERE clause
 */
const buildLikeWhere = (column, value, pattern = SearchPatterns.CONTAINS) => {
    if (!value || value.trim() === '') {
        return ''
    }
    
    // Escape special MySQL characters to prevent SQL injection
    const escapedValue = value.replace(/[%_\\]/g, '\\$&')
    const patternValue = pattern(escapedValue)
    
    return ` WHERE ${column} LIKE '${patternValue}' `
}

/**
 * Build multiple WHERE conditions with LIKE patterns
 * @param {Array} conditions - Array of {column, value, pattern} objects
 * @param {string} operator - 'AND' or 'OR'
 * @returns {string} WHERE clause
 */
const buildMultipleLikeWhere = (conditions, operator = 'OR') => {
    const validConditions = conditions.filter(cond => 
        cond.value && cond.value.trim() !== '' && cond.column
    )
    
    if (validConditions.length === 0) {
        return ''
    }
    
    const clauses = validConditions.map(cond => {
        const escapedValue = cond.value.replace(/[%_\\]/g, '\\$&')
        const pattern = cond.pattern || SearchPatterns.CONTAINS
        const patternValue = pattern(escapedValue)
        return `${cond.column} LIKE '${patternValue}'`
    })
    
    return ` WHERE (${clauses.join(` ${operator} `)}) `
}

module.exports = {
    SearchPatterns,
    buildLikeWhere,
    buildMultipleLikeWhere
}