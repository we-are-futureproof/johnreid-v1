#!/usr/bin/env node
/**
 * Test Script for Data Integrity Reporting
 * 
 * This script directly tests the integrity reporting functionality with a simulated issue
 */

import chalk from 'chalk';
import dotenv from 'dotenv';
import { runIntegrityReport, checkSqlExecutionFunction } from './geocoding/lib/integrity-report.js';
import { initSupabase, getSupabase } from './geocoding/lib/db.js';

// Load environment variables
dotenv.config();

async function testIntegrityReport() {
  console.log(chalk.blue.bold('🧪 Testing Data Integrity Reporting'));

  // Initialize Supabase
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error(chalk.red('Supabase URL or key not found in environment variables'));
    process.exit(1);
  }
  
  console.log(chalk.blue('Initializing Supabase client...'));
  initSupabase(supabaseUrl, supabaseKey);
  console.log(chalk.green('Supabase initialized successfully'));
  
  // Check if SQL execution function is available
  const sqlCheckResult = await checkSqlExecutionFunction();
  if (!sqlCheckResult) {
    console.error(chalk.red('SQL execution function check failed. Cannot proceed with testing.'));
    process.exit(1);
  }

  // Create a test SQL statement that will definitely return data (simulating a problem)
  const supabase = getSupabase();
  const testSQL = `
    SELECT 1 as id, 'Test Issue' as description, 'SIMULATED' as issue_type
  `;

  console.log(chalk.blue('Running direct test SQL query:'));
  console.log(chalk.gray(testSQL));

  try {
    // Run the test SQL directly
    const { data, error } = await supabase.rpc('run_sql', { sql_query: testSQL });

    console.log(chalk.blue('Direct SQL test result:'));
    if (error) {
      console.error(chalk.red('Error running test SQL:'), error);
    } else {
      console.log(chalk.green('SQL executed successfully'));
      console.log('Raw result:', JSON.stringify(data, null, 2));
      console.log('Type of data:', typeof data);
      console.log('Is array:', Array.isArray(data));
      
      if (data) {
        if (Array.isArray(data)) {
          console.log(`Array length: ${data.length}`);
        } else if (typeof data === 'object') {
          console.log('Object keys:', Object.keys(data));
        }
      }
    }

    // Now run the full integrity report
    console.log(chalk.blue.bold('\nRunning the full integrity report:'));
    const reportResult = await runIntegrityReport();
    
    console.log(chalk.blue('Report execution complete:'));
    console.log('Report result:', JSON.stringify(reportResult, null, 2));

  } catch (error) {
    console.error(chalk.red('Test failed with error:'), error);
  }
}

// Run the test
testIntegrityReport()
  .then(() => {
    console.log(chalk.green.bold('✅ Test completed'));
  })
  .catch(error => {
    console.error(chalk.red('Test failed:'), error);
    process.exit(1);
  });
