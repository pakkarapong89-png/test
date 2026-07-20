module.paths.push('c:/work/mcptest/node_modules');
require('dotenv').config({ path: 'c:/work/mcptest/.env' });
const { readLogs, addActivityLog } = require('c:/work/mcptest/nextjs-app/lib/logs.js');

async function main() {
  console.log('--- 1. Testing Local readLogs() ---');
  try {
    const logs = await readLogs();
    console.log(`Logs read successfully. Count: ${logs.length}`);
    console.log('Logs content:', JSON.stringify(logs, null, 2));
  } catch (err) {
    console.error('Failed to read logs:', err);
  }

  console.log('\n--- 2. Testing Local addActivityLog() ---');
  try {
    await addActivityLog('Test User Local', 'Developer', 'test', 'TES-LOCAL', 'บีบอัดและทดสอบระบบบันทึก Log');
    console.log('Log added successfully.');
  } catch (err) {
    console.error('Failed to add log:', err);
  }

  console.log('\n--- 3. Verifying Local readLogs() again ---');
  try {
    const logs = await readLogs();
    console.log(`Logs read successfully. Count: ${logs.length}`);
    if (logs.length > 0) {
      console.log('Latest Log:', JSON.stringify(logs[0], null, 2));
    }
  } catch (err) {
    console.error('Failed to read logs again:', err);
  }
}

main();
