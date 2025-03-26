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
  console.log('Running database integrity checks...');
  
  try {
    // Check if SQL directory exists
    if (!fs.existsSync(SQL_DIR)) {
      console.error(`Error: SQL directory not found at ${SQL_DIR}`);
      return { success: false, error: 'SQL_DIR_NOT_FOUND' };
    }
    
    // Get the Supabase client
    const supabase = getSupabase();
    
    // Get list of SQL files
    const sqlFiles = fs.readdirSync(SQL_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure consistent execution order
    
    if (sqlFiles.length === 0) {
      console.error('Warning: No SQL files found in the sql directory');
      return { success: false, error: 'NO_SQL_FILES' };
    }
    
    console.log(`Found ${sqlFiles.length} SQL integrity check files`);
    
    // Results object to store report data
    const results = {
      success: true,
      timestamp: new Date().toISOString(),
      checkResults: []
    };
    
    // Total issues found
    let totalIssuesFound = 0;
    
    // Execute each SQL file
    for (const sqlFile of sqlFiles) {
      const filePath = path.join(SQL_DIR, sqlFile);
      const fileName = path.basename(sqlFile, '.sql');
      const displayName = fileName.replace(/^\d+-/, '').replace(/-/g, ' ');
      
      console.log(`\n---- Running integrity check: ${displayName} ----`);
      
      try {
        // Read the SQL file content
        const sqlContent = fs.readFileSync(filePath, 'utf8');
        console.log(`SQL content from ${sqlFile}:`);
        console.log(sqlContent);
        
        // Execute the query directly - keeping it simple
        console.log(`\nExecuting SQL from ${sqlFile}`);
        
        // Execute the SQL query
        const result = await supabase.rpc('run_sql', { 
          sql_query: sqlContent 
        });
        
        // Log any errors from the query execution
        if (result.error) {
          console.error(`Error executing SQL in ${sqlFile}:`, result.error);
          results.checkResults.push({
            name: displayName,
            file: sqlFile,
            success: false,
            error: result.error.message
          });
          continue;
        }
        
        // Log the raw result for debugging
        console.log(`\nRAW RESULT from ${sqlFile}:`);
        console.log('Result data type:', typeof result.data);
        console.log('Is array:', Array.isArray(result.data));
        console.log('Full raw data:', JSON.stringify(result.data, null, 2));
        
        // Handle the data based on its type
        let rowData = [];
        
        if (Array.isArray(result.data)) {
          rowData = result.data;
          console.log(`Data is already an array with ${rowData.length} rows`);
        } else if (typeof result.data === 'object' && result.data !== null) {
          console.log('Raw object data:', result.data);
          
          // Check if any property is an array we can use
          const arrayProps = Object.entries(result.data)
            .filter(([key, value]) => Array.isArray(value));
            
          if (arrayProps.length > 0) {
            rowData = arrayProps[0][1]; // Use the first array property
            console.log(`Using array from property '${arrayProps[0][0]}' with ${rowData.length} rows`);
          } else {
            // Just wrap the object in an array
            rowData = [result.data];
            console.log('Wrapping single object in array');
          }
        }
        
        // Log row count
        const rowCount = rowData.length;
        console.log(`Query returned ${rowCount} rows`);
        
        // If we have rows, show some sample data
        if (rowCount > 0) {
          console.log('Sample data:');
          console.log(JSON.stringify(rowData.slice(0, 3), null, 2));
          
          // Always count non-empty results as issues except for specific informational queries
          const isInformational = sqlFile.includes('recent-results') || 
                                 sqlFile.includes('processing-status');
                                 
          if (!isInformational) {
            totalIssuesFound += rowCount;
            console.log(`FOUND ${rowCount} ISSUES in ${sqlFile}`);
          } else {
            console.log(`Found ${rowCount} informational rows in ${sqlFile}`);
          }
        }
        
        // Add to results
        results.checkResults.push({
          name: displayName,
          file: sqlFile,
          success: true,
          rowCount: rowCount,
          data: rowData,
          isInformational: sqlFile.includes('recent-results') || 
                          sqlFile.includes('processing-status')
        });
        
      } catch (error) {
        console.error(`Error processing ${sqlFile}:`, error);
        results.checkResults.push({
          name: displayName,
          file: sqlFile,
          success: false,
          error: error.message
        });
      }
    }
    
    // Print summary
    console.log('\n---- Integrity Check Summary ----');
    console.log(`Total issues found: ${totalIssuesFound}`);
    
    if (totalIssuesFound === 0) {
      console.log('All checks passed! No data integrity issues found.');
    } else {
      console.log(`Found ${totalIssuesFound} potential data integrity issues.`);
      
      // Show issue details by file
      for (const check of results.checkResults) {
        if (check.success && check.rowCount > 0 && !check.isInformational) {
          console.log(`- ${check.name}: ${check.rowCount} issues`);
        }
      }
    }
    
    // Set success flag based on issues found
    results.totalIssues = totalIssuesFound;
    
    return results;
    
  } catch (error) {
    console.error('Error running integrity report:', error);
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
