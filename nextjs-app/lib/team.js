import fs from 'fs';
import path from 'path';
import { query, isDbConnected } from './db';

const DATA_DIR = path.join(process.cwd(), 'data');
const TEAM_FILE = path.join(DATA_DIR, 'team_members.json');
const SPACES_MAP_FILE = path.join(DATA_DIR, 'user_spaces_map.json');

/**
 * Read team members (database with fallback to JSON file)
 */
export async function readTeam() {
  if (isDbConnected()) {
    try {
      const res = await query(
        `SELECT nickname, jira_display_name as "jiraDisplayName", email, webhook_url as "webhookUrl" 
         FROM team_members 
         ORDER BY nickname ASC`
      );
      return res.rows;
    } catch (err) {
      console.error('[DATABASE] Failed to read team members:', err.message);
    }
  }

  // Fallback
  try {
    if (fs.existsSync(TEAM_FILE)) {
      const data = fs.readFileSync(TEAM_FILE, 'utf8');
      try {
        return JSON.parse(data);
      } catch (e) {
        return [];
      }
    }
  } catch (err) {
    console.error('Failed to read team members:', err.message);
  }
  return [];
}

/**
 * Save team members (database with fallback to JSON file)
 */
export async function writeTeam(team) {
  if (isDbConnected()) {
    try {
      // Sync list by clearing and re-inserting in a safe manner
      await query('DELETE FROM team_members');
      for (const m of team) {
        await query(
          `INSERT INTO team_members (nickname, jira_display_name, email, webhook_url)
           VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [m.nickname, m.jiraDisplayName, m.email || '', m.webhookUrl || '']
        );
      }
      console.log('✅ [DATABASE_TEAM] Synced team members list');
      return;
    } catch (err) {
      console.error('[DATABASE] Failed to sync team members:', err.message);
    }
  }

  // Fallback
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(TEAM_FILE, JSON.stringify(team, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save team members locally:', err.message);
  }
}

/**
 * Read the user spaces map (database with fallback to JSON file)
 */
export async function readSpacesMap() {
  if (isDbConnected()) {
    try {
      const res = await query('SELECT nickname, space_name as "spaceName" FROM user_spaces_map');
      const map = {};
      res.rows.forEach(row => {
        map[row.nickname] = row.spaceName;
      });
      return map;
    } catch (err) {
      console.error('[DATABASE] Failed to read spaces map:', err.message);
    }
  }

  // Fallback
  try {
    if (fs.existsSync(SPACES_MAP_FILE)) {
      const data = fs.readFileSync(SPACES_MAP_FILE, 'utf8');
      try {
        return JSON.parse(data);
      } catch (e) {
        return {};
      }
    }
  } catch (err) {
    console.error('Failed to read spaces map:', err.message);
  }
  return {};
}

/**
 * Write the user spaces map (database with fallback to JSON file)
 */
export async function writeSpacesMap(map) {
  if (isDbConnected()) {
    try {
      for (const [nickname, spaceName] of Object.entries(map)) {
        await query(
          `INSERT INTO user_spaces_map (nickname, space_name)
           VALUES ($1, $2)
           ON CONFLICT (nickname) DO UPDATE SET space_name = EXCLUDED.space_name`,
          [nickname, spaceName]
        );
      }
      console.log('✅ [DATABASE_SPACES] Synced user spaces map');
      return;
    } catch (err) {
      console.error('[DATABASE] Failed to sync user spaces map:', err.message);
    }
  }

  // Fallback
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SPACES_MAP_FILE, JSON.stringify(map, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write spaces map locally:', err.message);
  }
}
