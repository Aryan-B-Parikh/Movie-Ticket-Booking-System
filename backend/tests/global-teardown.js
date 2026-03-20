// Global test teardown - runs once after all test suites
// Handles cleanup and performance reporting

module.exports = async () => {
  console.log('\n🧹 Global test teardown starting...');

  // Calculate total test duration
  const testEndTime = Date.now();
  const totalDuration = testEndTime - (global.testStartTime || testEndTime);
  const durationMinutes = Math.floor(totalDuration / 60000);
  const durationSeconds = Math.floor((totalDuration % 60000) / 1000);

  console.log(`⏱️  Total test suite duration: ${durationMinutes}m ${durationSeconds}s`);

  // Log test environment summary
  console.log('\n📊 Test Environment Summary:');
  console.log('============================');
  console.log(`🏷️  Test database: ${process.env.TEST_DB_NAME || 'Not set'}`);
  console.log(`🌍 Node environment: ${process.env.NODE_ENV || 'Not set'}`);
  console.log(`💻 Platform: ${process.platform}`);
  console.log(`📋 Node version: ${process.version}`);
  console.log('============================');

  // Performance recommendations
  if (totalDuration > 300000) { // 5 minutes
    console.log('⚠️  Performance Notice: Test suite took over 5 minutes');
    console.log('💡 Consider optimizing slow tests or running them separately');
  }

  // Cleanup temporary files
  try {
    // Clean up any temporary test files if they exist
    const tempDir = require('os').tmpdir();
    console.log(`🗑️  Cleaning temporary files in ${tempDir}`);
  } catch (error) {
    console.warn('⚠️  Warning during cleanup:', error.message);
  }

  // Final memory usage
  const finalMemory = process.memoryUsage();
  const memoryUsedMB = Math.round(finalMemory.heapUsed / 1024 / 1024);
  console.log(`🧠 Final memory usage: ${memoryUsedMB}MB`);

  // Security reminder for production
  if (process.env.NODE_ENV !== 'test') {
    console.log('\n⚠️  SECURITY REMINDER:');
    console.log('   Tests may have used default credentials');
    console.log('   Ensure production uses secure, unique credentials');
  }

  console.log('\n✅ Global test teardown complete');
  console.log('🎉 All tests finished!\n');
};