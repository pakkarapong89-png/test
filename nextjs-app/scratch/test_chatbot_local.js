import axios from 'axios';

const url = 'http://localhost:3000/api/webhook?secret=8c424dbad196cedf9e090ffa26dc753a';

const payload = {
  type: 'MESSAGE',
  user: {
    displayName: 'Pakkarapong GULSUWAN',
    email: 'pakkarapong.g@ku.th'
  },
  message: {
    text: '@sekloso เพิ่ม จัสตินบีเบอร์ ใน วัดดูยูมีน',
    argumentText: 'เพิ่ม จัสตินบีเบอร์ ใน วัดดูยูมีน',
    space: {
      name: 'spaces/AAQA9USB_jA',
      type: 'ROOM'
    }
  }
};

async function test() {
  console.log('Sending request to local server...');
  const start = Date.now();
  try {
    const res = await axios.post(url, payload);
    console.log(`Status: ${res.status}`);
    console.log('Response JSON:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('Request failed:', err.response?.data ? JSON.stringify(err.response.data) : err.message);
  } finally {
    console.log(`Duration: ${Date.now() - start}ms`);
  }
}

test();
