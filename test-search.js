const { SearchPatterns, buildLikeWhere, buildMultipleLikeWhere } = require('./utils/searchPatterns')

console.log('Testing LIKE Search Patterns:')
console.log('============================')

// Test basic patterns
const testValue = 'การ'
console.log(`Search value: "${testValue}"`)
console.log(`EXACT:        "${SearchPatterns.EXACT(testValue)}"`)
console.log(`STARTS_WITH:  "${SearchPatterns.STARTS_WITH(testValue)}"`)
console.log(`ENDS_WITH:    "${SearchPatterns.ENDS_WITH(testValue)}"`)
console.log(`CONTAINS:     "${SearchPatterns.CONTAINS(testValue)}"`)

console.log('\nTesting WHERE clause building:')
console.log('==============================')

// Test single WHERE clauses
console.log('Single column search:')
console.log(buildLikeWhere('division_name', 'การ', SearchPatterns.CONTAINS))
console.log(buildLikeWhere('division_id', 'DIV', SearchPatterns.STARTS_WITH))

// Test multiple WHERE clauses
console.log('\nMultiple column search (OR):')
const conditions = [
    { column: 'division_id', value: 'DIV', pattern: SearchPatterns.STARTS_WITH },
    { column: 'division_name', value: 'การ', pattern: SearchPatterns.CONTAINS }
]
console.log(buildMultipleLikeWhere(conditions, 'OR'))

console.log('\nMultiple column search (AND):')
console.log(buildMultipleLikeWhere(conditions, 'AND'))

// Test special character escaping
console.log('\nTesting special character escaping:')
console.log('===================================')
const specialValue = 'test_value%with\\special'
console.log(`Original: "${specialValue}"`)
console.log(buildLikeWhere('test_column', specialValue, SearchPatterns.CONTAINS))