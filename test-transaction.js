// Test file to verify MySQL transaction functionality
const { ExecuteSQL } = require('./db')

// Mock response object for testing
const mockRes = {
    send: (data) => {
        console.log('Response sent:', JSON.stringify(data, null, 2))
    }
}

async function testTransaction() {
    console.log('Testing MySQL transaction functionality...')
    
    try {
        const db = new ExecuteSQL(mockRes)
        
        // Test simple queries (these should work with any MySQL database)
        const testQueries = [
            "SELECT 1 as test_value",
            "SELECT NOW() as current_time"
        ]
        
        console.log('Executing test transaction...')
        await db.executeTransactionAndSend(testQueries)
        
        console.log('✅ Transaction test completed successfully!')
        
    } catch (error) {
        console.error('❌ Transaction test failed:', error.message)
    }
}

// Run the test
testTransaction()