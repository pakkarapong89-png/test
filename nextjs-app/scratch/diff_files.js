import fs from 'fs';
import path from 'path';

const dirA = 'C:\\Users\\MSI\\Desktop\\Desktop_Folders\\ส่งมอบ\\nextjs-app';
const dirB = 'C:\\work\\mcptest\\nextjs-app\\nextjs-app';

const targetFiles = ['app/api/webhook/route.js', 'lib/ai.js', 'lib/jira.js'];

targetFiles.forEach(relPath => {
  const pathA = path.join(dirA, relPath);
  const pathB = path.join(dirB, relPath);

  const linesA = fs.readFileSync(pathA, 'utf8').replace(/\r\n/g, '\n').split('\n');
  const linesB = fs.readFileSync(pathB, 'utf8').replace(/\r\n/g, '\n').split('\n');

  console.log('--------------------------------------------------');
  console.log(`FILE: ${relPath}`);
  console.log('--------------------------------------------------');

  let count = 0;
  for (let i = 0; i < Math.max(linesA.length, linesB.length); i++) {
    const lineA = linesA[i];
    const lineB = linesB[i];
    if (lineA !== lineB) {
      count++;
      if (count <= 25) {
        console.log(`Line ${i + 1}:`);
        console.log(`  [ส่งมอบ]:  ${lineA !== undefined ? JSON.stringify(lineA) : '<EOF>'}`);
        console.log(`  [ปัจจุบัน]: ${lineB !== undefined ? JSON.stringify(lineB) : '<EOF>'}`);
      }
    }
  }
  console.log(`Total line differences in ${relPath}: ${count}\n`);
});
