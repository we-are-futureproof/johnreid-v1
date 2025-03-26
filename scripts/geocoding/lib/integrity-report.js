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
          console.log(chalk.blue(`Executing query ${index+1}/${queries.length} in ${sqlFile}: ${query}`));
          const result = await supabase.rpc('run_sql', { sql_query: query });
          
          if (result.error) {
            console.error(chalk.red(`Error executing query ${index + 1} in ${sqlFile}:`), result.error);
            queryResults.push({
              success: false,
              error: result.error.message,
              query: query
            });
            continue;
          }
          
          // Debug the raw response
          console.log(chalk.blue(`Raw SQL response type:`, typeof result.data));
          console.log(chalk.blue(`Raw SQL response:`, result.data ? JSON.stringify(result.data).substring(0, 200) + '...' : 'No data'));
          
          // Try to extract the data in different ways
          let processedData;
          if (Array.isArray(result.data)) {
            processedData = result.data;
            console.log(chalk.green(`✅ Data is already an array with ${result.data.length} rows`));
          } else if (typeof result.data === 'object' && result.data !== null) {
            // If data is an object, convert to array of objects
            const entries = Object.entries(result.data);
            if (entries.length > 0) {
              console.log(chalk.yellow(`⚠️ Data is an object, attempting to convert to array`));
              if (Array.isArray(entries[0][1])) {
                // If first value is an array, use that
                processedData = entries[0][1];
                console.log(chalk.green(`✅ Extracted array with ${processedData.length} rows from object property`));
              } else {
                // Otherwise create an array with this single object
                processedData = [result.data];
                console.log(chalk.yellow(`⚠️ Created single-item array from object`));
              }
            } else {
              processedData = [];
              console.log(chalk.yellow(`⚠️ Object has no entries, using empty array`));
            }
          } else {
            processedData = [];
            console.log(chalk.red(`❌ Could not process data of type ${typeof result.data}`));
          }
          
          // Process results with the extracted data
          const resultCount = processedData ? processedData.length : 0;
          
          // Skip displaying full data for large result sets
          let displayData = processedData;
          if (resultCount > 10) {
            displayData = processedData.slice(0, 10);
            if (isInformational) {
              console.log(chalk.blue(`ℹ️ Query returned ${resultCount} rows. Showing first 10:`));
            } else {
              console.log(chalk.yellow(`⚠️ Query returned ${resultCount} rows. Showing first 10:`));
            }
          } else if (resultCount === 0) {
            if (!isInformational) {
              console.log(chalk.green('✅ No issues found (query returned 0 rows)'));
            } else {
              console.log(chalk.blue('ℹ️ No data returned'));
            }
          } else {
            if (isInformational) {
              console.log(chalk.blue(`ℹ️ Found ${resultCount} informational rows`));
            } else {
              console.log(chalk.yellow(`⚠️ Found ${resultCount} potential issues!`));
            }
          }
          
          // Display results in a formatted way
          if (displayData && displayData.length > 0) {
            console.log('Sample of results:');
            console.table(displayData.slice(0, 3));
            console.log(chalk.yellow(`First result: ${JSON.stringify(displayData[0])}`));
          }
          
          queryResults.push({
            success: true,
            rowCount: resultCount,
            data: processedData
          });
          
          // Mark that this check found issues
          if (resultCount > 0) {
            console.log(chalk.yellow(`\u26a0\ufe0f Marked ${resultCount} issues for file ${sqlFile}`));
          }
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
    
    // Calculate total issues found
    let totalIssues = 0;
    let issueDetails = [];
    
    for (const check of results.checkResults) {
      if (check.queryResults) {
        for (const query of check.queryResults) {
          if (query.rowCount && query.rowCount > 0) {
            totalIssues += query.rowCount;
            issueDetails.push(`${check.name}: ${query.rowCount} issues`);
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
      console.log(chalk.yellow('Review the detailed output above for more information.'));
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
