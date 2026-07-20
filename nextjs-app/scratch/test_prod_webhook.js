import axios from 'axios';
import 'dotenv/config';

const domain = process.env.JIRA_DOMAIN || 'ku-team-pa0al2cy.atlassian.net';
console.log('Testing Vercel Webhook endpoint...');

// We test against local server or Vercel
async function test() {
  const url = `http://localhost:3000/api/webhook?secret=8c424dbad196cedf9e090ffa26dc753a`;
  const payload = {
    type: 'MESSAGE',
    user: {
      displayName: 'Pakkarapong GULSUWAN',
      email: 'pakkarapong.g@ku.th'
    },
    message: {
      text: '@sekloso เพิ่ม จัสตินบีเบอร์19 ใน วัดซับแมน',
      argumentText: 'เพิ่ม จัสตินบีเบอร์19 ใน วัดซับแมน',
      space: {
        name: 'spaces/AAQA9USB_jA',
        type: 'ROOM'
      }
    }
  };

  const t0 = Date.now();
  try {
    const res = await axios.post(url, payload);
    console.log(`Status: ${res.status} in ${Date.now() - t0} ms`);
    console.log('Response JSON:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('Request failed:', err.response?.data ? JSON.stringify(err.response.data) : err.message);
  }
}

test();
