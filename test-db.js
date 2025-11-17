const { ExecuteSQL } = require('./db')

async function testDatabase() {
    try {
        console.log('Testing database connection...')
        
        // Create a mock response object for testing
        const mockRes = {
            send: (data) => {
                console.log('Response:', JSON.stringify(data, null, 2))
            }
        }
        
        const db = new ExecuteSQL(mockRes)
        
        // Test simple query
        console.log('Testing simple SELECT query...')
        const result = await db.executeSQL('SELECT 1 as test')
        console.log('Query result:', result)
        
        console.log('Database test completed successfully!')
        process.exit(0)
        
    } catch (error) {
        console.error('Database test failed!')
        console.error('Error:', error.message)
        console.error('Stack:', error.stack)
        process.exit(1)
    }
}

testDatabase()