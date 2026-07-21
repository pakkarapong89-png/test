import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { hashPassword } from './auth.js';

const connectionString = process.env.DATABASE_URL;

let pool = null;
let initialized = false;
let dbDisabled = false; // Flag to disable DB if connection or init fails

if (connectionString) {
  pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false // Required for Supabase/Neon connection SSL
    }
  });
} else {
  console.warn('⚠️ DATABASE_URL is not set. Database features will fallback to local file system or memory.');
  dbDisabled = true;
}

export async function query(text, params) {
  if (!pool || dbDisabled) {
    throw new Error('Database is disabled or not initialized.');
  }
  await initDb();
  if (dbDisabled) {
    throw new Error('Database was disabled during initialization.');
  }
  return pool.query(text, params);
}

// Global initialization promise to prevent race conditions
let initPromise = null;

export async function initDb() {
  if (!pool || dbDisabled) return;
  if (initialized) return;
  if (initPromise) return initPromise;


  initPromise = (async () => {
    try {
      console.log('🔄 [DATABASE] Initializing tables if they do not exist...');
      
      // Perform a quick query to test connection first
      await pool.query('SELECT 1');

      // 1. Create tables and migrations in a single batch query to minimize RTT latency
      await pool.query(`
        CREATE TABLE IF NOT EXISTS team_members (
          id SERIAL PRIMARY KEY,
          nickname VARCHAR(100) UNIQUE NOT NULL,
          jira_display_name VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255),
          webhook_url TEXT
        );

        CREATE TABLE IF NOT EXISTS activity_logs (
          id SERIAL PRIMARY KEY,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          username VARCHAR(100) NOT NULL,
          role VARCHAR(100) NOT NULL,
          action VARCHAR(100) NOT NULL,
          ticket_key VARCHAR(100),
          details TEXT
        );

        CREATE TABLE IF NOT EXISTS ticket_status_cache (
          ticket_key VARCHAR(100) PRIMARY KEY,
          status VARCHAR(100) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS user_spaces_map (
          nickname VARCHAR(100) PRIMARY KEY,
          space_name TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(100) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          salt VARCHAR(200) NOT NULL,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          role VARCHAR(100) NOT NULL DEFAULT 'Pending',
          is_approved BOOLEAN NOT NULL DEFAULT FALSE,
          jira_display_name VARCHAR(255),
          jira_account_id VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS tickets (
          key VARCHAR(100) PRIMARY KEY,
          summary VARCHAR(255) NOT NULL,
          status VARCHAR(100) NOT NULL,
          issuetype VARCHAR(100) NOT NULL,
          priority VARCHAR(100) NOT NULL,
          assignee VARCHAR(255),
          reporter VARCHAR(255),
          created TIMESTAMP WITH TIME ZONE,
          duedate DATE,
          resolved TIMESTAMP WITH TIME ZONE,
          parent VARCHAR(100),
          description TEXT,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS action_sources (
          ticket_key VARCHAR(100) PRIMARY KEY,
          source VARCHAR(100) NOT NULL,
          actor VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS webhook_logs (
          id SERIAL PRIMARY KEY,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          endpoint VARCHAR(100) NOT NULL,
          status INTEGER NOT NULL,
          details TEXT,
          error TEXT
        );

        ALTER TABLE users ADD COLUMN IF NOT EXISTS jira_display_name VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS jira_account_id VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
      `);

      // Seed default admin account if users table is empty
      const checkUsers = await pool.query('SELECT COUNT(*) FROM users');
      if (parseInt(checkUsers.rows[0].count) === 0) {
        const { hash, salt } = hashPassword('admin123');
        await pool.query(
          `INSERT INTO users (username, password_hash, salt, name, role, is_approved, jira_display_name)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          ['admin', hash, salt, 'ผู้ดูแลระบบ', 'Admin', true, 'ผู้ดูแลระบบ']
        );
        console.log('🔐 [DATABASE] Default admin account seeded (admin / admin123).');
      }

      console.log('✅ [DATABASE] Tables and migrations initialized successfully.');

      // 2. Auto-migration from legacy local JSON files if DB tables are empty
      const dataDir = path.join(process.cwd(), 'data');

      // Migrate Team Members
      const checkTeam = await pool.query('SELECT COUNT(*) FROM team_members');
      if (parseInt(checkTeam.rows[0].count) === 0) {
        const localTeam = path.join(dataDir, 'team_members.json');
        if (fs.existsSync(localTeam)) {
          try {
            const data = JSON.parse(fs.readFileSync(localTeam, 'utf8'));
            console.log(`📦 [DATABASE_MIGRATION] Migrating ${data.length} team members from local JSON...`);
            for (const m of data) {
              await pool.query(
                `INSERT INTO team_members (nickname, jira_display_name, email, webhook_url)
                 VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
                [m.nickname, m.jiraDisplayName, m.email || '', m.webhookUrl || '']
              );
            }
          } catch (e) {
            console.error('Failed to migrate local team members:', e.message);
          }
        }
      }

      // Migrate Activity Logs
      const checkLogs = await pool.query('SELECT COUNT(*) FROM activity_logs');
      if (parseInt(checkLogs.rows[0].count) === 0) {
        const localLogs = path.join(dataDir, 'activity_logs.json');
        if (fs.existsSync(localLogs)) {
          try {
            const data = JSON.parse(fs.readFileSync(localLogs, 'utf8'));
            console.log(`📦 [DATABASE_MIGRATION] Migrating ${data.length} activity logs from local JSON...`);
            for (const l of data.reverse()) { // Insert oldest first to maintain correct serial IDs
              await pool.query(
                `INSERT INTO activity_logs (timestamp, username, role, action, ticket_key, details)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [l.timestamp, l.user, l.role, l.action, l.ticketKey || null, l.details]
              );
            }
          } catch (e) {
            console.error('Failed to migrate local logs:', e.message);
          }
        }
      }

      // Migrate Ticket Status Cache
      const checkCache = await pool.query('SELECT COUNT(*) FROM ticket_status_cache');
      if (parseInt(checkCache.rows[0].count) === 0) {
        const localCache = path.join(dataDir, 'ticket_status_cache.json');
        if (fs.existsSync(localCache)) {
          try {
            const data = JSON.parse(fs.readFileSync(localCache, 'utf8'));
            console.log(`📦 [DATABASE_MIGRATION] Migrating status cache from local JSON...`);
            for (const [key, status] of Object.entries(data)) {
              await pool.query(
                `INSERT INTO ticket_status_cache (ticket_key, status)
                 VALUES ($1, $2) ON CONFLICT (ticket_key) DO UPDATE SET status = EXCLUDED.status`,
                [key, status]
              );
            }
          } catch (e) {
            console.error('Failed to migrate local status cache:', e.message);
          }
        }
      }

      // Migrate User Spaces Map
      const checkSpaces = await pool.query('SELECT COUNT(*) FROM user_spaces_map');
      if (parseInt(checkSpaces.rows[0].count) === 0) {
        const localSpaces = path.join(dataDir, 'user_spaces_map.json');
        if (fs.existsSync(localSpaces)) {
          try {
            const data = JSON.parse(fs.readFileSync(localSpaces, 'utf8'));
            console.log(`📦 [DATABASE_MIGRATION] Migrating user spaces map from local JSON...`);
            for (const [nickname, spaceName] of Object.entries(data)) {
              await pool.query(
                `INSERT INTO user_spaces_map (nickname, space_name)
                 VALUES ($1, $2) ON CONFLICT (nickname) DO UPDATE SET space_name = EXCLUDED.space_name`,
                [nickname, spaceName]
              );
            }
          } catch (e) {
            console.error('Failed to migrate local spaces map:', e.message);
          }
        }
      }

      initialized = true;
    } catch (err) {
      console.error('❌ [DATABASE] Initialization failed. Disabling database features:', err.message);
      dbDisabled = true;
      initPromise = null; // reset to allow retrying
    }
  })();

  return initPromise;
}

export function isDbConnected() {
  return pool !== null && !dbDisabled && initialized;
}
