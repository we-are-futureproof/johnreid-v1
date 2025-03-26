// Simple script to check if required environment variables are set
// without exposing their values
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get current directory and parent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Load environment variables
config({ path: join(rootDir, '.env') });

const requiredVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_MAPBOX_ACCESS_TOKEN'
];

// Check if each required variable is set
const missing = requiredVars.filter(varName => !process.env[varName]);

if (missing.length > 0) {
  console.error('⚠️ The following environment variables are missing:');
  missing.forEach(varName => console.error(`  - ${varName}`));
  console.error('\nPlease add them to your .env file before running the geocoding script.');
  process.exit(1);
} else {
  console.log('✅ All required environment variables are set.');
}
