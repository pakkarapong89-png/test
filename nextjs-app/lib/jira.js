import axios from 'axios';
import fs from 'fs';
import path from 'path';

const TEAM_FILE = path.join(process.cwd(), 'data', 'team_members.json');

function getCredentials() {
  const { JIRA_DOMAIN, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY } = process.env;
  const credentials = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
  return { JIRA_DOMAIN, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY, credentials };
}

/**
 * Fetch all tickets from Jira for the dashboard
 */
export async function fetchJiraTickets() {
  const { JIRA_DOMAIN, JIRA_PROJECT_KEY, credentials } = getCredentials();
  const url = `https://${JIRA_DOMAIN}/rest/api/3/search/jql`;

  const payload = {
    jql: `project = ${JIRA_PROJECT_KEY} AND summary !~ "__ACTIVITY_LOGS__" ORDER BY created DESC`,
    maxResults: 100,
    fields: ['summary', 'status', 'issuetype', 'assignee', 'reporter', 'priority', 'created', 'duedate', 'parent', 'description', 'resolutiondate'],
  };

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  const getPlainDescription = (descriptionObj) => {
    if (!descriptionObj) return '';
    if (typeof descriptionObj === 'string') return descriptionObj;
    try {
      let text = '';
      if (descriptionObj.content) {
        descriptionObj.content.forEach((p) => {
          if (p.content) {
            p.content.forEach((t) => {
              if (t.type === 'text') text += t.text;
            });
          }
          text += '\n';
        });
      }
      return text.trim();
    } catch (e) {
      return '';
    }
  };

  return response.data.issues.map((issue) => ({
    id: issue.id,
    key: issue.key,
    summary: issue.fields.summary || '(ไม่มีชื่อ)',
    status: issue.fields.status?.name || 'Unknown',
    issuetype: issue.fields.issuetype?.name || 'Task',
    priority: issue.fields.priority?.name || 'Medium',
    assignee: issue.fields.assignee?.displayName || 'Unassigned',
    reporter: issue.fields.reporter?.displayName || null,
    created: issue.fields.created,
    duedate: issue.fields.duedate || null,
    resolved: issue.fields.resolutiondate || null,
    parent: issue.fields.parent?.key || null,
    description: getPlainDescription(issue.fields.description),
  }));
}

/**
 * Create a Jira Issue
 */
export async function createJiraIssue(data) {
  const { JIRA_DOMAIN, JIRA_PROJECT_KEY, credentials } = getCredentials();
  const url = `https://${JIRA_DOMAIN}/rest/api/3/issue`;

  const adfDescription = {
    version: 1,
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: data.description || 'No description provided.' }] }],
  };

  const issueTypeId = await getIssueTypeId(JIRA_PROJECT_KEY, data.issuetype);

  const fields = {
    project: { key: JIRA_PROJECT_KEY },
    summary: data.summary,
    description: adfDescription,
    issuetype: { id: issueTypeId },
    priority: { name: data.priority || 'Medium' },
  };

  if (data.parentKey) fields.parent = { key: data.parentKey.trim().toUpperCase() };
  if (data.dueDate) fields.duedate = data.dueDate;
  if (data.assigneeName) {
    const user = await findJiraUser(data.assigneeName);
    if (user && user.accountId) {
      fields.assignee = { id: user.accountId };
      data.resolvedAssigneeEmail = user.emailAddress;
      data.resolvedAssigneeName = user.displayName;
    }
  }

  const response = await axios.post(url, { fields }, {
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}

/**
 * Update a Jira Issue
 */
export async function updateJiraIssue(key, data) {
  const { JIRA_DOMAIN, credentials } = getCredentials();
  const url = `https://${JIRA_DOMAIN}/rest/api/3/issue/${key}`;

  const fields = {};
  if (data.summary) fields.summary = data.summary;
  if (data.description) {
    fields.description = {
      version: 1,
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: data.description }] }],
    };
  }
  if (data.priority) fields.priority = { name: data.priority };
  if (data.dueDate !== undefined) fields.duedate = data.dueDate || null;
  if (data.assigneeName) {
    const user = await findJiraUser(data.assigneeName);
    if (user && user.accountId) {
      fields.assignee = { id: user.accountId };
      data.resolvedAssigneeEmail = user.emailAddress;
      data.resolvedAssigneeName = user.displayName;
    }
  }

  const response = await axios.put(url, { fields }, {
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}

/**
 * Get available transitions for a Jira ticket
 */
export async function getIssueTransitions(key) {
  const { JIRA_DOMAIN, credentials } = getCredentials();
  const url = `https://${JIRA_DOMAIN}/rest/api/3/issue/${key}/transitions`;

  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Basic ${credentials}`, Accept: 'application/json' },
    });
    return response.data.transitions;
  } catch (err) {
    console.error(`Failed to fetch transitions for ${key}:`, err.message);
  }
  return null;
}

/**
 * Execute a status transition on a Jira ticket
 */
export async function transitionIssue(key, transitionId) {
  const { JIRA_DOMAIN, credentials } = getCredentials();
  const url = `https://${JIRA_DOMAIN}/rest/api/3/issue/${key}/transitions`;

  const response = await axios.post(url, { transition: { id: transitionId } }, {
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}

/**
 * Get the changelog (status transition history) for a Jira ticket
 */
export async function getIssueChangelog(key) {
  const { JIRA_DOMAIN, credentials } = getCredentials();
  const url = `https://${JIRA_DOMAIN}/rest/api/3/issue/${key}?expand=changelog`;

  const response = await axios.get(url, {
    headers: { Authorization: `Basic ${credentials}`, Accept: 'application/json' },
  });

  const changelog = response.data.changelog;
  if (!changelog || !changelog.histories) return [];

  const statusChanges = [];
  changelog.histories.forEach((history) => {
    const statusItem = history.items.find((item) => item.field === 'status');
    if (statusItem) {
      statusChanges.push({
        id: history.id,
        author: history.author.displayName,
        created: history.created,
        from: statusItem.fromString,
        to: statusItem.toString,
      });
    }
  });

  return statusChanges;
}

/**
 * Fetch the issue type name for a specific Jira ticket key
 */
export async function getJiraIssueType(key) {
  const { JIRA_DOMAIN, credentials } = getCredentials();
  const url = `https://${JIRA_DOMAIN}/rest/api/3/issue/${key}?fields=issuetype`;

  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Basic ${credentials}`, Accept: 'application/json' },
    });
    return response.data.fields.issuetype.name;
  } catch (err) {
    console.error(`Failed to fetch issue type for key "${key}":`, err.message);
  }
  return null;
}

/**
 * Fetch the summary of a Jira ticket key
 */
export async function getJiraIssueSummary(key) {
  const { JIRA_DOMAIN, credentials } = getCredentials();
  const url = `https://${JIRA_DOMAIN}/rest/api/3/issue/${key}?fields=summary`;

  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Basic ${credentials}`, Accept: 'application/json' },
    });
    return response.data.fields.summary;
  } catch (err) {
    console.error(`Failed to fetch issue summary for key "${key}":`, err.message);
  }
  return null;
}

/**
 * Fetch a single Jira ticket and return it mapped to a flat object
 */
export async function fetchJiraTicketByKey(key) {
  const { JIRA_DOMAIN, credentials } = getCredentials();
  const url = `https://${JIRA_DOMAIN}/rest/api/3/issue/${key}`;

  const response = await axios.get(url, {
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: 'application/json',
    },
  });

  const issue = response.data;
  
  const getPlainDescription = (descriptionObj) => {
    if (!descriptionObj) return '';
    if (typeof descriptionObj === 'string') return descriptionObj;
    try {
      let text = '';
      if (descriptionObj.content) {
        descriptionObj.content.forEach((p) => {
          if (p.content) {
            p.content.forEach((t) => {
              if (t.type === 'text') text += t.text;
            });
          }
          text += '\n';
        });
      }
      return text.trim();
    } catch (e) {
      return '';
    }
  };

  return {
    id: issue.id,
    key: issue.key,
    summary: issue.fields.summary || '(ไม่มีชื่อ)',
    status: issue.fields.status?.name || 'Unknown',
    issuetype: issue.fields.issuetype?.name || 'Task',
    priority: issue.fields.priority?.name || 'Medium',
    assignee: issue.fields.assignee?.displayName || 'Unassigned',
    reporter: issue.fields.reporter?.displayName || null,
    created: issue.fields.created,
    duedate: issue.fields.duedate || null,
    resolved: issue.fields.resolutiondate || null,
    parent: issue.fields.parent?.key || null,
    description: getPlainDescription(issue.fields.description),
  };
}


/**
 * Get the correct Issue Type ID for a project
 */
export async function getIssueTypeId(projectKey, requestedType) {
  const { JIRA_DOMAIN, credentials } = getCredentials();
  const url = `https://${JIRA_DOMAIN}/rest/api/3/project/${projectKey}`;

  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Basic ${credentials}`, Accept: 'application/json' },
    });
    const issueTypes = response.data.issueTypes;
    let match;

    if (requestedType === 'Sub-task') {
      match = issueTypes.find((it) => it.subtask === true);
    } else if (requestedType === 'Epic') {
      match = issueTypes.find((it) => it.name.toLowerCase() === 'epic');
    } else {
      match = issueTypes.find((it) => it.name.toLowerCase() === requestedType.toLowerCase());
      if (!match) match = issueTypes.find((it) => it.subtask === false && it.name.toLowerCase() !== 'epic');
    }

    if (match) return match.id;
  } catch (err) {
    console.error(`Failed to fetch issue types for project ${projectKey}:`, err.message);
  }
  return requestedType === 'Sub-task' ? '10003' : '10001';
}

/**
 * Search for a Jira Issue by its Summary (Title) with fuzzy matching
 */
export async function searchJiraIssueBySummary(summary) {
  const { JIRA_DOMAIN, JIRA_PROJECT_KEY, credentials } = getCredentials();
  const url = `https://${JIRA_DOMAIN}/rest/api/3/search/jql`;

  const payload = {
    jql: `project = ${JIRA_PROJECT_KEY} AND summary !~ "__ACTIVITY_LOGS__" ORDER BY statusCategory ASC, created DESC`,
    maxResults: 100,
    fields: ['key', 'summary'],
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    const issues = response.data.issues;
    if (issues && issues.length > 0) {
      const cleanSummary = summary.trim().toLowerCase();

      let match = issues.find((issue) => issue.fields.summary.trim().toLowerCase() === cleanSummary);

      if (!match) {
        match = issues.find((issue) => {
          const s = issue.fields.summary.trim().toLowerCase();
          return s.includes(cleanSummary) || cleanSummary.includes(s);
        });
      }

      if (!match) {
        let bestMatch = null;
        let highestScore = 0;
        issues.forEach((issue) => {
          const score = calculateStringSimilarity(issue.fields.summary, summary);
          if (score > highestScore && score >= 0.65) {
            highestScore = score;
            bestMatch = issue;
          }
        });
        if (bestMatch) match = bestMatch;
      }

      if (match) return { key: match.key, summary: match.fields.summary };
    }
  } catch (err) {
    console.error(`Failed to search issue by summary "${summary}":`, err.message);
  }
  return null;
}

/**
 * Find Jira User details by name (with nickname resolution from team_members.json)
 */
export async function findJiraUser(query) {
  const { JIRA_DOMAIN, credentials } = getCredentials();

  let searchQuery = query;
  if (fs.existsSync(TEAM_FILE)) {
    try {
      const team = JSON.parse(fs.readFileSync(TEAM_FILE, 'utf8'));
      const found = team.find(
        (m) => m.nickname && m.nickname.trim().toLowerCase() === query.trim().toLowerCase()
      );
      if (found && found.jiraDisplayName) {
        searchQuery = found.jiraDisplayName;
      }
    } catch (e) {
      console.error('Error reading team_members.json in findJiraUser:', e.message);
    }
  }

  const url = `https://${JIRA_DOMAIN}/rest/api/3/user/search?query=${encodeURIComponent(searchQuery)}`;

  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Basic ${credentials}`, Accept: 'application/json' },
    });
    const users = response.data.filter((u) => u.active);
    if (users.length > 0) {
      let emailAddress = users[0].emailAddress;

      if (fs.existsSync(TEAM_FILE)) {
        try {
          const team = JSON.parse(fs.readFileSync(TEAM_FILE, 'utf8'));
          const found = team.find(
            (m) => m.jiraDisplayName && m.jiraDisplayName.trim().toLowerCase() === users[0].displayName.trim().toLowerCase()
          );
          if (found && found.email) emailAddress = found.email;
        } catch (e) {}
      }

      if (!emailAddress && (users[0].displayName.includes('ภัครพงษ์') || users[0].displayName.toLowerCase().includes('pakkarapong'))) {
        emailAddress = 'pakkarapong.g@ku.th';
      }

      return { accountId: users[0].accountId, emailAddress, displayName: users[0].displayName };
    }
  } catch (err) {
    console.error('Error searching for Jira user:', err.message);
  }
  return null;
}

/**
 * Fetch pending Jira tasks for bot summary
 */
export async function fetchPendingJiraTasks(issueType = null, displayTypeName = 'งานทั้งหมด') {
  const { JIRA_DOMAIN, JIRA_PROJECT_KEY, credentials } = getCredentials();
  const url = `https://${JIRA_DOMAIN}/rest/api/3/search/jql`;

  let jql = `project = ${JIRA_PROJECT_KEY} AND statusCategory != Done AND summary !~ "__ACTIVITY_LOGS__"`;
  if (issueType) {
    if (issueType === 'Sub-task') {
      jql += ` AND issuetype in subTaskIssueTypes()`;
    } else {
      jql += ` AND issuetype = "${issueType}"`;
    }
  }
  jql += ` ORDER BY priority DESC, created DESC`;

  const payload = {
    jql,
    maxResults: 15,
    fields: ['summary', 'status', 'issuetype', 'assignee', 'priority', 'duedate'],
  };

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  const issues = response.data.issues;
  if (!issues || issues.length === 0) {
    return `🎉 *เย้! ไม่มี ${displayTypeName} ค้างเลยครับ (ทุกงานเสร็จหมดแล้ว)*`;
  }

  const bkkTimeStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' });
  const today = new Date(bkkTimeStr);
  today.setHours(0, 0, 0, 0);

  const overdue = [];
  const dueToday = [];
  const otherPending = [];

  issues.forEach((issue) => {
    const dueDateStr = issue.fields.duedate;
    if (dueDateStr) {
      const due = new Date(dueDateStr);
      due.setHours(0, 0, 0, 0);
      if (due < today) {
        overdue.push(issue);
      } else if (due.getTime() === today.getTime()) {
        dueToday.push(issue);
      } else {
        otherPending.push(issue);
      }
    } else {
      otherPending.push(issue);
    }
  });

  const totalCount = response.data.total || issues.length;
  let text = `📋 *สรุป ${displayTypeName} ที่ยังไม่เสร็จ (พบทั้งหมด ${totalCount} รายการ):*\n\n`;

  if (overdue.length > 0) {
    text += `🔴 *งานที่เกินกำหนดส่ง (Overdue - ${overdue.length} งาน):*\n`;
    overdue.forEach((issue) => {
      const key = issue.key;
      const summary = issue.fields.summary;
      const status = issue.fields.status.name;
      const issueTypeName = issue.fields.issuetype ? issue.fields.issuetype.name : 'Task';
      const assignee = issue.fields.assignee ? issue.fields.assignee.displayName : 'ยังไม่มีผู้รับผิดชอบ';
      const dueDate = issue.fields.duedate;
      const priority = issue.fields.priority ? issue.fields.priority.name : 'Medium';
      const jiraUrl = `https://${JIRA_DOMAIN}/browse/${key}`;

      text += `• 🔴 *[${key}] ${summary}* (${issueTypeName})\n`;
      text += `  └ สถานะ: *${status}* | ความสำคัญ: *${priority}* | ผู้ทำ: *${assignee}* | กำหนดส่งเดิม: *${dueDate}* (เกินกำหนดแล้ว!)\n`;
      text += `  └ ลิงก์: ${jiraUrl}\n\n`;
    });
  }

  if (dueToday.length > 0) {
    text += `🟡 *งานที่ต้องส่งวันนี้ (Due Today - ${dueToday.length} งาน):*\n`;
    dueToday.forEach((issue) => {
      const key = issue.key;
      const summary = issue.fields.summary;
      const status = issue.fields.status.name;
      const issueTypeName = issue.fields.issuetype ? issue.fields.issuetype.name : 'Task';
      const assignee = issue.fields.assignee ? issue.fields.assignee.displayName : 'ยังไม่มีผู้รับผิดชอบ';
      const dueDate = issue.fields.duedate;
      const priority = issue.fields.priority ? issue.fields.priority.name : 'Medium';
      const jiraUrl = `https://${JIRA_DOMAIN}/browse/${key}`;

      text += `• 🟡 *[${key}] ${summary}* (${issueTypeName})\n`;
      text += `  └ สถานะ: *${status}* | ความสำคัญ: *${priority}* | ผู้ทำ: *${assignee}* | กำหนดส่ง: *วันนี้ (${dueDate})*\n`;
      text += `  └ ลิงก์: ${jiraUrl}\n\n`;
    });
  }

  if (otherPending.length > 0) {
    text += `📋 *งานที่ยังไม่ถึงกำหนดส่ง / ไม่ได้ระบุเวลา (${otherPending.length} งาน):*\n`;
    otherPending.forEach((issue) => {
      const key = issue.key;
      const summary = issue.fields.summary;
      const status = issue.fields.status.name;
      const issueTypeName = issue.fields.issuetype ? issue.fields.issuetype.name : 'Task';
      const assignee = issue.fields.assignee ? issue.fields.assignee.displayName : 'ยังไม่มีผู้รับผิดชอบ';
      const dueDate = issue.fields.duedate || 'ไม่ได้ระบุวันส่งงาน';
      const priority = issue.fields.priority ? issue.fields.priority.name : 'Medium';
      const jiraUrl = `https://${JIRA_DOMAIN}/browse/${key}`;

      text += `• *[${key}]* ${summary} (${issueTypeName})\n`;
      text += `  └ สถานะ: *${status}* | ความสำคัญ: *${priority}* | ผู้ทำ: *${assignee}* | กำหนดส่ง: *${dueDate}*\n`;
      text += `  └ ลิงก์: ${jiraUrl}\n\n`;
    });
  }

  return text;
}

/**
 * Fetch Jira tasks due today or overdue for daily summary
 */
export async function fetchDailyDueTasks() {
  const { JIRA_DOMAIN, JIRA_PROJECT_KEY, credentials } = getCredentials();
  const url = `https://${JIRA_DOMAIN}/rest/api/3/search/jql`;

  const jql = `project = ${JIRA_PROJECT_KEY} AND statusCategory != Done AND summary !~ "__ACTIVITY_LOGS__" ORDER BY priority DESC, duedate ASC, created DESC`;
  const payload = {
    jql,
    maxResults: 50,
    fields: ['summary', 'status', 'issuetype', 'assignee', 'priority', 'duedate'],
  };

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  const issues = response.data.issues;
  if (!issues || issues.length === 0) {
    return `☀️ **สวัสดียามเช้าครับทีมงาน!**\nยินดีด้วยครับ วันนี้ไม่มีงานค้างในระบบเลย ทุกคนลุยงานอื่นต่อได้เลยครับ 🚀`;
  }

  const bkkTimeStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' });
  const today = new Date(bkkTimeStr);
  today.setHours(0, 0, 0, 0);

  const overdue = [];
  const dueToday = [];
  const otherPending = [];

  issues.forEach((issue) => {
    const dueDateStr = issue.fields.duedate;
    if (dueDateStr) {
      const due = new Date(dueDateStr);
      due.setHours(0, 0, 0, 0);
      if (due < today) {
        overdue.push(issue);
      } else if (due.getTime() === today.getTime()) {
        dueToday.push(issue);
      } else {
        otherPending.push(issue);
      }
    } else {
      otherPending.push(issue);
    }
  });

  let text = `🔔 *สวัสดียามเช้าครับทีมงาน! รายงานสรุปสถานะงานประจำวันมาแล้วครับ:*\n\n`;

  if (overdue.length > 0) {
    text += `🔴 *งานที่เกินกำหนดส่ง (Overdue - ${overdue.length} งาน):*\n`;
    overdue.forEach((issue) => {
      const key = issue.key;
      const summary = issue.fields.summary;
      const status = issue.fields.status.name;
      const issueTypeName = issue.fields.issuetype ? issue.fields.issuetype.name : 'Task';
      const assignee = issue.fields.assignee ? issue.fields.assignee.displayName : 'ยังไม่มีผู้รับผิดชอบ';
      const dueDate = issue.fields.duedate;
      const jiraUrl = `https://${JIRA_DOMAIN}/browse/${key}`;

      text += `• 🔴 *[${key}] ${summary}* (${issueTypeName})\n`;
      text += `  └ สถานะ: *${status}* | ผู้ทำ: *${assignee}* | กำหนดส่งเดิม: *${dueDate}* (เกินกำหนดแล้ว!)\n`;
      text += `  └ ลิงก์: ${jiraUrl}\n\n`;
    });
  }

  if (dueToday.length > 0) {
    text += `🟡 *งานที่ต้องส่งวันนี้ (Due Today - ${dueToday.length} งาน):*\n`;
    dueToday.forEach((issue) => {
      const key = issue.key;
      const summary = issue.fields.summary;
      const status = issue.fields.status.name;
      const issueTypeName = issue.fields.issuetype ? issue.fields.issuetype.name : 'Task';
      const assignee = issue.fields.assignee ? issue.fields.assignee.displayName : 'ยังไม่มีผู้รับผิดชอบ';
      const dueDate = issue.fields.duedate;
      const jiraUrl = `https://${JIRA_DOMAIN}/browse/${key}`;

      text += `• 🟡 *[${key}] ${summary}* (${issueTypeName})\n`;
      text += `  └ สถานะ: *${status}* | ผู้ทำ: *${assignee}* | กำหนดส่ง: *วันนี้ (${dueDate})*\n`;
      text += `  └ ลิงก์: ${jiraUrl}\n\n`;
    });
  }

  if (otherPending.length > 0) {
    text += `📋 *งานอื่น ๆ ที่ยังไม่เสร็จ (${otherPending.length} งาน):*\n`;
    otherPending.forEach((issue) => {
      const key = issue.key;
      const summary = issue.fields.summary;
      const status = issue.fields.status.name;
      const issueTypeName = issue.fields.issuetype ? issue.fields.issuetype.name : 'Task';
      const assignee = issue.fields.assignee ? issue.fields.assignee.displayName : 'ยังไม่มีผู้รับผิดชอบ';
      const dueDate = issue.fields.duedate || 'ไม่ได้ระบุวันส่งงาน';
      const jiraUrl = `https://${JIRA_DOMAIN}/browse/${key}`;

      text += `• *[${key}]* ${summary} (${issueTypeName})\n`;
      text += `  └ สถานะ: *${status}* | ผู้ทำ: *${assignee}* | กำหนดส่ง: *${dueDate}*\n`;
      text += `  └ ลิงก์: ${jiraUrl}\n\n`;
    });
  }

  text += `ขอให้วันนี้เป็นวันที่ดีของการทำงาน และสู้ ๆ กับการเคลียร์งานนะครับ! ✌️`;
  return text;
}

/**
 * Get the transition author for a specific ticket status change
 */
export async function getRecentTransitionAuthor(ticketKey, targetStatus) {
  const { JIRA_DOMAIN, credentials } = getCredentials();
  const url = `https://${JIRA_DOMAIN}/rest/api/3/issue/${ticketKey}?expand=changelog`;

  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Basic ${credentials}`, Accept: 'application/json' },
    });

    const changelog = response.data.changelog;
    if (!changelog || !changelog.histories) return null;

    // วนจากล่าสุดไปเก่าสุด เพื่อหา transition ที่เพิ่งเกิดขึ้น
    for (let i = changelog.histories.length - 1; i >= 0; i--) {
      const history = changelog.histories[i];
      const statusItem = history.items.find((item) => item.field === 'status');
      // Jira changelog ใช้ field 'toString' (string value) เป็นชื่อ status ปลายทาง
      if (statusItem && typeof statusItem.toString === 'string' &&
          statusItem.toString.toLowerCase() === targetStatus.toLowerCase()) {
        return history.author ? history.author.displayName : null;
      }
    }
  } catch (err) {
    console.error(`Failed to fetch transition author for ${ticketKey}:`, err.message);
  }
  return null;
}

/**
 * Calculate Jaccard character-level similarity between two strings
 */
function calculateStringSimilarity(str1, str2) {
  const s1 = str1.trim().toLowerCase().replace(/[^ก-๙a-z0-9]/g, '');
  const s2 = str2.trim().toLowerCase().replace(/[^ก-๙a-z0-9]/g, '');

  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  let intersection = 0;
  const s2Arr = s2.split('');
  s1.split('').forEach((char) => {
    const index = s2Arr.indexOf(char);
    if (index !== -1) {
      intersection++;
      s2Arr.splice(index, 1);
    }
  });

  const union = s1.length + s2.length - intersection;
  return union === 0 ? 0.0 : intersection / union;
}
