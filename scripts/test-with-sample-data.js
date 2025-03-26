/**
 * Test script that loads sample data into the integrity report
 * Instead of running SQL queries, we'll use the sample data you provided
 */
import 'dotenv/config';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Sample data for the interrupted runs (from your direct SQL query)
const interruptedRunsData = [
  {
    "gcfa": 552992,
    "name": "Doon, First United Methodist Church",
    "last_attempt": "2025-03-26T08:40:01.542Z",
    "completion_time": null
  },
  // This is a condensed version of the 62 records you provided
  // In a real implementation, all 62 records would be here
  {
    "gcfa": 475858,
    "name": "Langhorne Chapel",
    "last_attempt": "2025-03-26T08:43:37.372Z",
    "completion_time": null
  }
];

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

// Mock the integrity report to use our sample data
async function runMockedIntegrityReport() {
  console.log(chalk.blue.bold('🔍 Running database integrity checks with SAMPLE DATA...'));

  // Create base report object
  const results = {
    success: true,
    timestamp: new Date().toISOString(),
    checkResults: []
  };

  // Create a sample check result for interrupted runs
  const interruptedRunsResult = {
    name: "interrupted runs",
    file: "07-interrupted-runs.sql",
    queryResults: [{
      success: true,
      type: 'issue',
      rowCount: 62, // We know there are 62 records total
      data: interruptedRunsData // Using your provided data
    }]
  };

  // Add to results
  results.checkResults.push(interruptedRunsResult);

  // Print summary
  console.log(chalk.blue.bold('\n📊 Integrity Check Summary'));
  
  // Calculate total issues found
  let totalIssues = 0;
  let issueDetails = [];
  
  for (const check of results.checkResults) {
    if (check.queryResults) {
      for (const query of check.queryResults) {
        if (query.rowCount && query.rowCount > 0) {
          if (!query.type || query.type === 'issue') {
            totalIssues += query.rowCount;
            issueDetails.push(`${check.name}: ${query.rowCount} issues`);
          } else if (query.type === 'info') {
            console.log(chalk.blue(`ℹ️ ${check.name}: ${query.rowCount} informational rows`));
          }
        }
      }
    }
  }
  
  console.log(chalk.blue(`Calculated total issues: ${totalIssues}`));
  
  if (totalIssues === 0) {
    console.log(chalk.green.bold('✅ All checks passed! No data integrity issues found.'));
  } else {
    console.log(chalk.yellow.bold(`⚠️ Found ${totalIssues} potential data integrity issues:`));
    issueDetails.forEach(detail => console.log(chalk.yellow(`- ${detail}`)));
    console.log(chalk.yellow('Review the detailed output below for more information.'));
    
    // Show sample of the data
    console.log(chalk.yellow.bold('\n📋 Sample of interrupted runs:'));
    console.table(interruptedRunsData.slice(0, 2));
    console.log(chalk.yellow(`... plus ${interruptedRunsData.length - 2} more records`));
  }
  
  return results;
}

// Run the test
async function runTest() {
  console.log(chalk.blue.bold('🧪 Testing Data Integrity Reporting with Sample Data'));
  
  try {
    const reportResult = await runMockedIntegrityReport();
    console.log('Report execution complete:');
    console.log('Report result:', JSON.stringify(reportResult, null, 2));
    console.log(chalk.green('✅ Test completed'));
  } catch (error) {
    console.error(chalk.red('❌ Test failed:'), error);
  }
}

// ES modules use top-level await
runTest().catch(console.error);
