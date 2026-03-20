// Test results processor for performance metrics and reporting
// Analyzes test performance and generates detailed reports

const fs = require('fs');
const path = require('path');

module.exports = (results) => {
  console.log('\n📊 Processing test results...');

  const {
    testResults,
    numTotalTests,
    numPassedTests,
    numFailedTests,
    numTodoTests,
    runExecError,
    numTotalTestSuites,
    numPassedTestSuites,
    numFailedTestSuites,
    numRuntimeErrorTestSuites,
    testStartTime,
    testEndTime
  } = results;

  const totalDuration = testEndTime - testStartTime;
  const avgTestTime = numTotalTests > 0 ? totalDuration / numTotalTests : 0;

  // Performance analysis
  const performanceData = {
    summary: {
      totalTests: numTotalTests,
      passedTests: numPassedTests,
      failedTests: numFailedTests,
      todoTests: numTodoTests,
      totalTestSuites: numTotalTestSuites,
      passedTestSuites: numPassedTestSuites,
      failedTestSuites: numFailedTestSuites,
      errorTestSuites: numRuntimeErrorTestSuites,
      totalDuration,
      avgTestTime: Math.round(avgTestTime),
      successRate: numTotalTests > 0 ? (numPassedTests / numTotalTests * 100).toFixed(2) : 0
    },
    testSuites: []
  };

  // Analyze individual test suites
  testResults.forEach(testResult => {
    if (testResult.testResults) {
      const suiteData = {
        testPath: testResult.testFilePath,
        suiteName: path.basename(testResult.testFilePath, '.test.js'),
        numTests: testResult.numPassingTests + testResult.numFailingTests + testResult.numTodoTests,
        passedTests: testResult.numPassingTests,
        failedTests: testResult.numFailingTests,
        todoTests: testResult.numTodoTests,
        duration: testResult.perfStats.end - testResult.perfStats.start,
        avgTestTime: 0,
        slowTests: [],
        failedTestNames: []
      };

      // Calculate average test time for this suite
      if (suiteData.numTests > 0) {
        suiteData.avgTestTime = Math.round(suiteData.duration / suiteData.numTests);
      }

      // Identify slow tests (> 1 second)
      testResult.testResults.forEach(test => {
        if (test.duration && test.duration > 1000) {
          suiteData.slowTests.push({
            name: test.title,
            duration: test.duration
          });
        }

        // Collect failed test names
        if (test.status === 'failed') {
          suiteData.failedTestNames.push(test.title);
        }
      });

      performanceData.testSuites.push(suiteData);
    }
  });

  // Sort test suites by duration (slowest first)
  performanceData.testSuites.sort((a, b) => b.duration - a.duration);

  // Generate performance report
  console.log('\n📈 Performance Report:');
  console.log('=====================');
  console.log(`⏱️  Total Duration: ${Math.round(totalDuration / 1000)}s`);
  console.log(`📊 Success Rate: ${performanceData.summary.successRate}%`);
  console.log(`⚡ Average Test Time: ${performanceData.summary.avgTestTime}ms`);

  // Identify performance issues
  const slowSuites = performanceData.testSuites.filter(suite => suite.duration > 30000); // > 30s
  if (slowSuites.length > 0) {
    console.log('\n⚠️  Slow Test Suites (>30s):');
    slowSuites.forEach(suite => {
      console.log(`   ${suite.suiteName}: ${Math.round(suite.duration / 1000)}s`);
    });
  }

  // Critical test suite analysis
  const criticalSuites = ['concurrency', 'booking-load', 'booking'];
  const criticalResults = performanceData.testSuites.filter(suite =>
    criticalSuites.some(critical => suite.suiteName.includes(critical))
  );

  if (criticalResults.length > 0) {
    console.log('\n🔥 Critical Test Suites:');
    criticalResults.forEach(suite => {
      const status = suite.failedTests > 0 ? '❌ FAILED' : '✅ PASSED';
      console.log(`   ${suite.suiteName}: ${status} (${Math.round(suite.duration / 1000)}s)`);
    });
  }

  // Concurrency test validation
  const concurrencyResults = performanceData.testSuites.find(suite =>
    suite.suiteName.includes('concurrency')
  );

  if (concurrencyResults) {
    if (concurrencyResults.failedTests === 0) {
      console.log('\n🏆 CRITICAL: Zero double-booking guarantee VERIFIED!');
    } else {
      console.log('\n🚨 CRITICAL: Concurrency tests FAILED - Double-booking risk detected!');
    }
  }

  // Write detailed report to file
  const reportPath = path.join(__dirname, '../coverage/performance-report.json');
  try {
    fs.writeFileSync(reportPath, JSON.stringify(performanceData, null, 2));
    console.log(`📄 Detailed report saved to: ${reportPath}`);
  } catch (error) {
    console.warn('⚠️  Could not save performance report:', error.message);
  }

  // Coverage analysis
  if (results.coverageMap) {
    const coverageData = results.coverageMap.getCoverageSummary();
    const lineCoverage = coverageData.lines.pct;
    const branchCoverage = coverageData.branches.pct;

    console.log('\n📊 Coverage Summary:');
    console.log(`   Lines: ${lineCoverage.toFixed(1)}%`);
    console.log(`   Branches: ${branchCoverage.toFixed(1)}%`);

    if (lineCoverage < 80) {
      console.log('⚠️  Warning: Line coverage below 80%');
    }
    if (branchCoverage < 80) {
      console.log('⚠️  Warning: Branch coverage below 80%');
    }
  }

  console.log('=====================\n');

  // Return results for Jest
  return results;
};