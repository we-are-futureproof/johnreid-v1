// Reporting utils for geocoding progress and results
import fs from 'fs';
import path from 'path';

// SQL query for tracking geocoding progress - used at startup and completion
export const GEOCODING_PROGRESS_SQL = `
WITH Total AS (
    -- Calculate the total number of records once
    SELECT CAST(COUNT(*) AS REAL) AS total_records -- Cast to REAL/FLOAT for division
    FROM umc_locations
),
ProcessedByStatus AS (
    -- Calculate counts for processed records grouped by status
    SELECT
        status,
        COUNT(*) AS status_count
    FROM umc_locations
    WHERE latitude IS NOT NULL
    GROUP BY status
),
Aggregates AS (
    -- Calculate overall processed, skipped, and pending counts
    SELECT
        -- Count processed records (latitude is NOT NULL)
        SUM(CASE WHEN latitude IS NOT NULL THEN 1 ELSE 0 END) AS processed_count,

        -- Count skipped records (latitude is NULL AND skip_geocoding is TRUE)
        SUM(CASE WHEN latitude IS NULL AND skip_geocoding = true THEN 1 ELSE 0 END) AS skipped_count,

        -- Count truly pending records (latitude is NULL AND skip_geocoding is FALSE or NULL)
        -- Using "IS DISTINCT FROM true" handles both FALSE and NULL safely.
        SUM(CASE WHEN latitude IS NULL AND skip_geocoding IS DISTINCT FROM true THEN 1 ELSE 0 END) AS pending_count

    FROM umc_locations
)
-- Combine the results using UNION ALL
SELECT
    1 AS row_num,
    p.status_count AS count_val,
    -- Format using TO_CHAR (FM removes leading/trailing spaces)
    TO_CHAR((p.status_count / t.total_records) * 100.0, 'FM990.00%') AS pct_formatted,
    p.status AS label
FROM ProcessedByStatus p
CROSS JOIN Total t

UNION ALL

SELECT
    2 AS row_num,
    a.processed_count AS count_val,
    -- Format using TO_CHAR
    TO_CHAR((a.processed_count / t.total_records) * 100.0, 'FM990.00%') AS pct_formatted,
    'Subtotal (Processed)' AS label
FROM Aggregates a
CROSS JOIN Total t

UNION ALL

SELECT
    3 AS row_num,
    a.skipped_count AS count_val,
    TO_CHAR((a.skipped_count / t.total_records) * 100.0, 'FM990.00%') AS pct_formatted,
    'Subtotal (Skipped)' AS label
FROM Aggregates a
CROSS JOIN Total t

UNION ALL

SELECT
    4 AS row_num,
    a.pending_count AS count_val,
    TO_CHAR((a.pending_count / t.total_records) * 100.0, 'FM990.00%') AS pct_formatted,
    'Subtotal (Pending)' AS label
FROM Aggregates a
CROSS JOIN Total t

UNION ALL

SELECT
    5 AS row_num,
    t.total_records AS count_val,
    '100.00%' AS pct_formatted,
    'Total Records' AS label
FROM Total t

ORDER BY row_num
`;

/**
 * Format and display the geocoding progress report
 * @param {Array} reportData - Data from the SQL progress query
 */
export function displayProgressReport(reportData) {
  console.log('\n===== GEOCODING PROGRESS REPORT =====');
  
  // Format and display the report in a nice table
  const columnWidths = {
    count: 10,
    pct: 10,
    label: 30
  };
  
  // Print table header
  console.log(
    '│ ' +
    'Count'.padEnd(columnWidths.count) +
    '│ ' +
    'Percent'.padEnd(columnWidths.pct) +
    '│ ' +
    'Category'.padEnd(columnWidths.label) +
    '│'
  );
  
  // Print separator line
  console.log(
    '├─' + '─'.repeat(columnWidths.count) +
    '┼─' + '─'.repeat(columnWidths.pct) +
    '┼─' + '─'.repeat(columnWidths.label) +
    '┤'
  );
  
  // Print data rows
  for (const row of reportData) {
    // Check if this is a subtotal or total row (rows 2-5)
    const isSubtotalOrTotal = row.row_num >= 2;
    
    // For subtotal or total rows, add a line before to separate
    if (isSubtotalOrTotal && row.row_num !== 2) {
      console.log(
        '├─' + '─'.repeat(columnWidths.count) +
        '┼─' + '─'.repeat(columnWidths.pct) +
        '┼─' + '─'.repeat(columnWidths.label) +
        '┤'
      );
    }
    
    console.log(
      '│ ' +
      row.count_val.toString().padEnd(columnWidths.count) +
      '│ ' +
      row.pct_formatted.padEnd(columnWidths.pct) +
      '│ ' +
      row.label.padEnd(columnWidths.label) +
      '│'
    );
  }
  
  // Print table footer
  console.log(
    '└─' + '─'.repeat(columnWidths.count) +
    '┴─' + '─'.repeat(columnWidths.pct) +
    '┴─' + '─'.repeat(columnWidths.label) +
    '┘'
  );
  
  console.log('=====================================\n');
}

// Track the current error log file
let currentErrorLogFile = null;

/**
 * Append errors to log file periodically to avoid memory issues
 * @param {Array} errors - Array of error messages to append
 * @param {boolean} isFinal - Whether this is the final flush (default: false)
 * @returns {string} - Path to the error log file
 */
export function appendErrorsToLogFile(errors, isFinal = false) {
  if (!errors || errors.length === 0) return null;
  
  const logsDir = './scripts/logs';
  
  // Create logs directory if it doesn't exist
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Create a new error log file if this is the first batch of errors
  if (!currentErrorLogFile) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    currentErrorLogFile = `${logsDir}/geocoding-errors-${timestamp}.log`;
  }
  
  // Append errors to the file
  fs.appendFileSync(currentErrorLogFile, errors.join('\n\n') + '\n\n');
  
  // Log only on the final flush or for the first error batch
  if (isFinal) {
    console.log(`All error details saved to: ${currentErrorLogFile}`);
  }
  
  return currentErrorLogFile;
}

/**
 * Save summary and error logs to files
 * @param {Object} results - Processing results
 * @param {Array} errors - Array of error messages
 * @param {Object} db - Database instance
 */
export async function saveResultsToFile(results, errors, db) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logsDir = './scripts/logs';
  
  // Create logs directory if it doesn't exist
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Append any remaining errors to the log file
  if (errors && errors.length > 0) {
    appendErrorsToLogFile(errors, true);
  }
  
  // Get database statistics for a more accurate report
  let dbStats = {
    total: 0,
    geocoded: 0,
    skipped: 0,
    pending: 0,
    low_confidence: 0
  };
  
  try {
    // Get total count
    const { count: totalCount, error: totalError } = await db.getSupabase()
      .from('umc_locations')
      .select('*', { count: 'exact', head: true });
    dbStats.total = totalCount || 0;
    
    // Get geocoded count (with latitude/longitude)
    const { count: geocodedCount, error: geocodedError } = await db.getSupabase()
      .from('umc_locations')
      .select('*', { count: 'exact', head: true })
      .not('latitude', 'is', null);
    dbStats.geocoded = geocodedCount || 0;
    
    // Get skipped count
    const { count: skippedCount, error: skippedError } = await db.getSupabase()
      .from('umc_locations')
      .select('*', { count: 'exact', head: true })
      .eq('skip_geocoding', true);
    dbStats.skipped = skippedCount || 0;
    
    // Calculate pending
    dbStats.pending = dbStats.total - dbStats.geocoded - dbStats.skipped;
    
    // Get low confidence count - this is trickier because we need to check JSON data
    // First try to get a simple estimate from recent results
    try {
      const { data: lowConfData } = await db.getSupabase()
        .from('umc_locations')
        .select('gcfa')
        .not('latitude', 'is', null)
        .not('details', 'is', null)
        .limit(1000);  // Limit to avoid excessive data retrieval
      
      // Count items with low_confidence flag in the results
      const lowConfidenceItems = lowConfData?.filter(item => {
        return item.details?.geocoding_data?.low_confidence === true;
      }) || [];
      
      dbStats.low_confidence = lowConfidenceItems.length;
    } catch (innerError) {
      console.warn('Error getting low confidence count:', innerError);
      dbStats.low_confidence = 0;
    }
    
  } catch (error) {
    console.error('Error getting database statistics for summary:', error);
    // Fallback to using result data if DB query fails
  }
  
  // Save summary to file
  const summaryFile = `${logsDir}/geocoding-summary-${timestamp}.txt`;
  
  // Build summary lines
  const summaryLines = [
    'GEOCODING SUMMARY',
    '================',
    `Date: ${new Date().toLocaleString()}`,
    '',
    '--- Current Session ---',
    `Total locations processed in this run: ${results.processed}`,
    `Successfully geocoded in this run: ${results.success}`,
    `Failed to geocode in this run: ${results.failed}`,
    `Skipped (incomplete address) in this run: ${results.skipped}`,
    '',
    '--- Overall Database Status ---',
    `Total UMC locations: ${dbStats.total}`,
    `Geocoded locations: ${dbStats.geocoded} (${((dbStats.geocoded/dbStats.total)*100).toFixed(1)}%)`,
    `Skipped locations: ${dbStats.skipped} (${((dbStats.skipped/dbStats.total)*100).toFixed(1)}%)`,
    `Pending locations: ${dbStats.pending} (${((dbStats.pending/dbStats.total)*100).toFixed(1)}%)`,
    `Low confidence results: ${dbStats.low_confidence} (${((dbStats.low_confidence/dbStats.geocoded)*100).toFixed(1)}% of geocoded)`
  ];
  
  fs.writeFileSync(summaryFile, summaryLines.join('\n'));
  console.log(`\nSummary saved to: ${summaryFile}`);
  
  // Also display the summary in the console
  console.log('\n' + summaryLines.join('\n') + '\n');
}
