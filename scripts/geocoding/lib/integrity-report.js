// Module for database integrity reporting
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { getSupabase } from './db.js';

// Get directory name for the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQL_DIR = path.join(__dirname, '..', 'sql');

/**
 * Run all SQL queries in the sql directory and report results
 * @returns {Promise<Object>} - Report results
 */
export async function runIntegrityReport() {
  console.log(chalk.blue.bold('🔍 Running database integrity checks...'));
  
  try {
    // Check if SQL directory exists
    if (!fs.existsSync(SQL_DIR)) {
      console.error(chalk.red(`Error: SQL directory not found at ${SQL_DIR}`));
      return { success: false, error: 'SQL_DIR_NOT_FOUND' };
    }
    
    // Get the Supabase client
    const supabase = getSupabase();
    
    // Get list of SQL files
    const sqlFiles = fs.readdirSync(SQL_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure consistent execution order
    
    if (sqlFiles.length === 0) {
      console.error(chalk.yellow('Warning: No SQL files found in the sql directory'));
      return { success: false, error: 'NO_SQL_FILES' };
    }
    
    console.log(chalk.blue(`Found ${sqlFiles.length} SQL integrity check files`));
    
    // Results object to store report data
    const results = {
      success: true,
      timestamp: new Date().toISOString(),
      checkResults: []
    };
    
    // Execute each SQL file
    for (const sqlFile of sqlFiles) {
      const filePath = path.join(SQL_DIR, sqlFile);
      const fileName = path.basename(sqlFile, '.sql');
      const displayName = fileName.replace(/^\d+-/, '').replace(/-/g, ' ');
      
      console.log(chalk.blue(`\n📋 Running integrity check: ${displayName}`));
      
      try {
        // Read the SQL file
        const sqlContent = fs.readFileSync(filePath, 'utf8');
        
        // Split by semicolon to handle multiple queries in one file
        const queries = sqlContent
          .split(';')
          .map(q => q.trim())
          .filter(q => q.length > 0 && !q.startsWith('--'));
        
        // Process each query in the file
        const queryResults = [];
        
        for (const [index, query] of queries.entries()) {
          // Skip empty queries or comments
          if (!query.trim() || query.trim().startsWith('--')) continue;
          
          // Execute the query
          const { data, error, count } = await supabase.rpc('run_sql', { sql_query: query });
          
          if (error) {
            console.error(chalk.red(`Error executing query ${index + 1} in ${sqlFile}:`), error);
            queryResults.push({
              success: false,
              error: error.message,
              query: query
            });
            continue;
          }
          
          // Process results
          const resultCount = data ? data.length : 0;
          
          // Skip displaying full data for large result sets
          let displayData = data;
          if (resultCount > 10) {
            displayData = data.slice(0, 10);
            console.log(chalk.yellow(`Query returned ${resultCount} rows. Showing first 10:`));
          } else if (resultCount === 0) {
            console.log(chalk.green('✅ No issues found (query returned 0 rows)'));
          } else {
            console.log(chalk.yellow(`Found ${resultCount} potential issues:`));
          }
          
          // Display results in a formatted way
          if (displayData && displayData.length > 0) {
            console.table(displayData);
          }
          
          queryResults.push({
            success: true,
            rowCount: resultCount,
            data: data
          });
        }
        
        // Add to overall results
        results.checkResults.push({
          name: displayName,
          file: sqlFile,
          queryResults
        });
        
      } catch (error) {
        console.error(chalk.red(`Error processing ${sqlFile}:`), error);
        results.checkResults.push({
          name: displayName,
          file: sqlFile,
          error: error.message,
          success: false
        });
      }
    }
    
    // Print summary
    console.log(chalk.blue.bold('\n📊 Integrity Check Summary'));
    const issueCount = results.checkResults.reduce((count, check) => {
      const rowCounts = check.queryResults?.map(q => q.rowCount || 0) || [0];
      return count + rowCounts.reduce((sum, c) => sum + c, 0);
    }, 0);
    
    if (issueCount === 0) {
      console.log(chalk.green.bold('✅ All checks passed! No data integrity issues found.'));
    } else {
      console.log(chalk.yellow(`⚠️ Found ${issueCount} potential data integrity issues.`));
      console.log('Review the detailed output above for more information.');
    }
    
    return results;
    
  } catch (error) {
    console.error(chalk.red('Error running integrity report:'), error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if the run_sql RPC function exists and is accessible
 * @returns {Promise<boolean>} - Whether the function exists and is accessible
 */
export async function checkSqlExecutionFunction() {
  try {
    const supabase = getSupabase();
    
    // Try to run a simple query to test if the run_sql function exists
    const { data, error } = await supabase.rpc('run_sql', { 
      sql_query: 'SELECT 1 AS test' 
    });
    
    if (error) {
      console.error('Error checking SQL execution function:', error);
      console.log('Make sure the run_sql function exists in your Supabase project.');
      return false;
    }
    
    console.log('SQL execution function is available and working.');
    return true;
  } catch (error) {
    console.error('Error checking SQL execution function:', error);
    return false;
  }
}
