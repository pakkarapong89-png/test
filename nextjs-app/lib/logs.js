import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { query, isDbConnected } from './db';

const DATA_DIR = path.join(process.cwd(), 'data');
const LOGS_FILE = path.join(DATA_DIR, 'activity_logs.json');
const CACHE_FILE = path.join(DATA_DIR, 'ticket_status_cache.json');

// Jira config for cloud logs persistence
function getJiraConfig() {
  const { JIRA_DOMAIN, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY } = process.env;
  if (!JIRA_DOMAIN || !JIRA_EMAIL || !JIRA_API_TOKEN || !JIRA_PROJECT_KEY) {
    return null;
  }
  const credentials = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
  return { JIRA_DOMAIN, JIRA_PROJECT_KEY, credentials };
}

/**
 * Read all activity logs (fetches from database with fallback to Jira project properties and local file)
 */
export async function readLogs() {
  if (isDbConnected()) {
    try {
      const res = await query(
        `SELECT timestamp, username as "user", role, action, ticket_key as "ticketKey", details 
         FROM activity_logs 
         ORDER BY timestamp DESC 
         LIMIT 100`
      );
      // Format timestamps to ISO strings
      return res.rows.map(row => ({
        ...row,
        timestamp: new Date(row.timestamp).toISOString()
      }));
    } catch (err) {
      console.error('[DATABASE] Failed to read activity logs:', err.message);
    }
  }

  // Fallback to Jira Properties / local file
  const config = getJiraConfig();
  if (config) {
    try {
      const url = `https://${config.JIRA_DOMAIN}/rest/api/3/project/${config.JIRA_PROJECT_KEY}/properties/activity_logs`;
      const res = await axios.get(url, {
        headers: { Authorization: `Basic ${config.credentials}`, Accept: 'application/json' }
      });
      if (res.data && res.data.value && res.data.value.logs) {
        return res.data.value.logs;
      }
    } catch (err) {
      if (err.response && err.response.status === 404) {
        return [];
      }
      console.error('[JIRA_PROPERTIES] Failed to read activity logs from Jira project:', err.message);
    }
  }

  // Fallback to local file read
  try {
    if (fs.existsSync(LOGS_FILE)) {
      const data = fs.readFileSync(LOGS_FILE, 'utf8');
      try {
        return JSON.parse(data);
      } catch (e) {
        return [];
      }
    }
  } catch (err) {
    console.error('Failed to read local logs:', err.message);
  }
  return [];
}

/**
 * Append a new activity log entry (saves to database, falling back to Jira Properties and local file)
 */
export async function addActivityLog(user, role, action, ticketKey, details) {
  const timestamp = new Date().toISOString();
  const newLog = { timestamp, user, role, action, ticketKey, details };

  if (isDbConnected()) {
    try {
      // Prevent duplicate logs within 15 seconds in the database
      const checkDup = await query(
        `SELECT id FROM activity_logs 
         WHERE action = $1 AND COALESCE(ticket_key, '') = COALESCE($2, '') AND details = $3 
         AND timestamp > NOW() - INTERVAL '15 seconds'`,
        [action, ticketKey || null, details]
      );
      
      if (checkDup.rows.length > 0) {
        console.log(`[LOG_DEDUP] Skipped duplicate: ${action} ${ticketKey}`);
        return;
      }

      await query(
        `INSERT INTO activity_logs (timestamp, username, role, action, ticket_key, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [timestamp, user, role, action, ticketKey || null, details]
      );
      console.log(`📝 [DATABASE_LOG] ${user} (${role}) - ${action} ${ticketKey || ''}: ${details}`);
      return;
    } catch (err) {
      console.error('[DATABASE] Failed to add activity log:', err.message);
    }
  }

  // Read current logs for duplication check in fallback
  let logs = [];
  try {
    logs = await readLogs();
  } catch (err) {
    logs = [];
  }

  // Prevent duplicate logs within 15 seconds
  const DEDUP_MS = 15 * 1000;
  const isDuplicate = logs.some(log => {
    if (log.action !== action || log.ticketKey !== ticketKey || log.details !== details) return false;
    return Math.abs(new Date(log.timestamp).getTime() - new Date(timestamp).getTime()) < DEDUP_MS;
  });

  if (isDuplicate) {
    console.log(`[LOG_DEDUP] Skipped duplicate: ${action} ${ticketKey}`);
    return;
  }

  logs.unshift(newLog);
  if (logs.length > 100) logs = logs.slice(0, 100);

  // Save to Jira Project Properties
  const config = getJiraConfig();
  if (config) {
    try {
      const url = `https://${config.JIRA_DOMAIN}/rest/api/3/project/${config.JIRA_PROJECT_KEY}/properties/activity_logs`;
      await axios.put(url, { logs }, {
        headers: {
          Authorization: `Basic ${config.credentials}`,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      });
      console.log(`📝 [JIRA_PROPERTIES] Successfully saved logs to project metadata`);
    } catch (err) {
      console.error('[JIRA_PROPERTIES] Failed to save logs to Jira project:', err.message);
    }
  }

  // Also write to local file as backup
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2), 'utf8');
    console.log(`📝 [LOCAL_LOG] ${user} (${role}) - ${action} ${ticketKey || ''}: ${details}`);
  } catch (err) {
    console.error('Failed to write local activity log:', err.message);
  }
}

/**
 * Read the ticket status cache (database with fallback to Jira Properties and local file)
 */
export async function readStatusCache() {
  if (isDbConnected()) {
    try {
      const res = await query('SELECT ticket_key, status FROM ticket_status_cache');
      const cache = {};
      res.rows.forEach(row => {
        cache[row.ticket_key] = row.status;
      });
      return cache;
    } catch (err) {
      console.error('[DATABASE] Failed to read status cache:', err.message);
    }
  }

  // Fallback to Jira Project Properties
  const config = getJiraConfig();
  if (config) {
    try {
      const url = `https://${config.JIRA_DOMAIN}/rest/api/3/project/${config.JIRA_PROJECT_KEY}/properties/ticket_status_cache`;
      const res = await axios.get(url, {
        headers: { Authorization: `Basic ${config.credentials}`, Accept: 'application/json' }
      });
      if (res.data && res.data.value && res.data.value.cache) {
        return res.data.value.cache;
      }
    } catch (err) {
      if (err.response && err.response.status === 404) {
        return {};
      }
      console.error('[JIRA_PROPERTIES] Failed to read status cache from Jira project:', err.message);
    }
  }

  // Fallback to local file read
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf8');
      try {
        return JSON.parse(data);
      } catch (e) {
        return {};
      }
    }
  } catch (err) {
    console.error('Failed to read local status cache:', err.message);
  }
  return {};
}

/**
 * Write the ticket status cache (database with fallback to Jira Properties and local file)
 */
export async function writeStatusCache(cache) {
  if (isDbConnected()) {
    try {
      for (const [key, status] of Object.entries(cache)) {
        await query(
          `INSERT INTO ticket_status_cache (ticket_key, status, updated_at) 
           VALUES ($1, $2, NOW()) 
           ON CONFLICT (ticket_key) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()`,
          [key, status]
        );
      }
      console.log(`📝 [DATABASE_CACHE] Successfully saved status cache`);
      return;
    } catch (err) {
      console.error('[DATABASE] Failed to save status cache:', err.message);
    }
  }

  const config = getJiraConfig();
  if (config) {
    try {
      const url = `https://${config.JIRA_DOMAIN}/rest/api/3/project/${config.JIRA_PROJECT_KEY}/properties/ticket_status_cache`;
      await axios.put(url, { cache }, {
        headers: {
          Authorization: `Basic ${config.credentials}`,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      });
      console.log(`📝 [JIRA_PROPERTIES] Successfully saved status cache to project metadata`);
    } catch (err) {
      console.error('[JIRA_PROPERTIES] Failed to save status cache to Jira project:', err.message);
    }
  }

  // Also write to local file as backup
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write local status cache:', err.message);
  }
}
