#!/usr/bin/env node
/**
 * Diagnostic Script for Integrity Report
 * Tests each component of the integrity report system
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { getSupabase, initSupabase } from './geocoding/lib/db.js';

// Load environment variables
dotenv.config();

// Get directory name for the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQL_DIR = path.join(__dirname, 'geocoding', 'sql');

async function runDiagnostics() {
  console.log(chalk.blue.bold('🔍 Running Integrity Report Diagnostics'));
  
  // Step 1: Check if SQL directory exists
  console.log(chalk.blue('\n1️⃣ Checking if SQL directory exists'));
  if (fs.existsSync(SQL_DIR)) {
    console.log(chalk.green(`✅ SQL directory exists at ${SQL_DIR}`));
  } else {
    console.log(chalk.red(`❌ SQL directory NOT found at ${SQL_DIR}`));
    return;
  }
  
  // Step 2: Check for SQL files
  console.log(chalk.blue('\n2️⃣ Checking for SQL files'));
  const sqlFiles = fs.readdirSync(SQL_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  if (sqlFiles.length === 0) {
    console.log(chalk.red('❌ No SQL files found in the SQL directory'));
    return;
  }
  
  console.log(chalk.green(`✅ Found ${sqlFiles.length} SQL files:`));
  sqlFiles.forEach(file => console.log(chalk.gray(`  - ${file}`)));
  
  // Step 3: Check file content
  console.log(chalk.blue('\n3️⃣ Checking content of SQL files'));
  
  for (const sqlFile of sqlFiles) {
    const filePath = path.join(SQL_DIR, sqlFile);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const contentPreview = content.substring(0, 100).replace(/\n/g, ' ') + (content.length > 100 ? '...' : '');
      console.log(chalk.gray(`  - ${sqlFile}: ${contentPreview}`));
      
      // Better query extraction that doesn't rely on semicolons
      let queries = [];
      // First try splitting by semicolons
      const queriesBySemicolon = content
        .split(';')
        .map(q => q.trim())
        .filter(q => q.length > 0);
      
      if (queriesBySemicolon.length > 1) {
        // If semicolons work, use that
        queries = queriesBySemicolon.filter(q => !q.startsWith('--'));
        console.log(chalk.green(`    Found ${queries.length} distinct queries using semicolon splitting`));
      } else {
        // If no semicolons, treat the entire content as one query after removing comments
        const singleQuery = content
          .split('\n')
          .filter(line => !line.trim().startsWith('--'))
          .join('\n')
          .trim();
        
        if (singleQuery.length > 0) {
          queries = [singleQuery];
          console.log(chalk.green(`    Found 1 query without semicolon`));
        } else {
          console.log(chalk.yellow(`    No queries found after removing comments`));
        }
      }
    } catch (error) {
      console.error(chalk.red(`❌ Error reading file ${sqlFile}:`), error);
    }
  }
  
  // Step 4: Initialize Supabase
  console.log(chalk.blue('\n4️⃣ Initializing Supabase connection'));
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error(chalk.red('❌ Supabase URL or key not found in environment variables'));
    return;
  }
  
  console.log(chalk.gray(`  Using Supabase URL: ${supabaseUrl}`));
  initSupabase(supabaseUrl, supabaseKey);
  console.log(chalk.green('✅ Supabase client initialized'));
  
  // Step 5: Test SQL execution
  console.log(chalk.blue('\n5️⃣ Testing SQL execution capability'));
  const supabase = getSupabase();
  const testSQL = 'SELECT 1 as test';
  
  try {
    const { data, error } = await supabase.rpc('run_sql', { sql_query: testSQL });
    
    if (error) {
      console.error(chalk.red('❌ SQL execution failed:'), error);
      return;
    }
    
    console.log(chalk.green('✅ SQL execution successful'));
    console.log(chalk.gray(`  Data type: ${typeof data}`));
    console.log(chalk.gray(`  Is array: ${Array.isArray(data)}`));
    console.log(chalk.gray(`  Result: ${JSON.stringify(data)}`));
  } catch (error) {
    console.error(chalk.red('❌ Error during SQL execution:'), error);
    return;
  }
  
  // Step 6: Test execution of an actual SQL file
  const testSqlFile = sqlFiles[0]; // Use the first SQL file for testing
  console.log(chalk.blue(`\n6️⃣ Testing execution of SQL file: ${testSqlFile}`));
  
  try {
    const filePath = path.join(SQL_DIR, testSqlFile);
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    
    // Extract query using improved method
    let queries = [];
    
    // First try splitting by semicolons
    const queriesBySemicolon = sqlContent
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0);
    
    if (queriesBySemicolon.length > 1) {
      // If semicolons work, use that
      queries = queriesBySemicolon.filter(q => !q.startsWith('--'));
    } else {
      // If no semicolons, treat the entire content as one query after removing comments
      const singleQuery = sqlContent
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n')
        .trim();
      
      if (singleQuery.length > 0) {
        queries = [singleQuery];
      }
    }
    
    if (queries.length === 0) {
      console.log(chalk.yellow('⚠️ No valid queries found in file'));
      return;
    }
    
    const query = queries[0];
    console.log(chalk.gray(`  Executing query: ${query}`));
    
    const { data, error } = await supabase.rpc('run_sql', { sql_query: query });
    
    if (error) {
      console.error(chalk.red('❌ SQL file execution failed:'), error);
      return;
    }
    
    console.log(chalk.green('✅ SQL file execution successful'));
    console.log(chalk.gray(`  Data type: ${typeof data}`));
    console.log(chalk.gray(`  Is array: ${Array.isArray(data)}`));
    
    if (Array.isArray(data)) {
      console.log(chalk.gray(`  Result rows: ${data.length}`));
      if (data.length > 0) {
        console.log(chalk.gray(`  First row: ${JSON.stringify(data[0])}`));
      }
    } else if (typeof data === 'object' && data !== null) {
      console.log(chalk.gray(`  Result keys: ${Object.keys(data)}`));
    }
  } catch (error) {
    console.error(chalk.red('❌ Error during SQL file execution:'), error);
  }
}

// Run diagnostics
runDiagnostics()
  .then(() => {
    console.log(chalk.blue.bold('\n🏁 Diagnostics complete'));
  })
  .catch(error => {
    console.error(chalk.red('Diagnostics failed with error:'), error);
    process.exit(1);
  });
