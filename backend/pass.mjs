// reset-pw.mjs
import { hash } from 'bcryptjs';

const password = 'admin'; // 👈 change this
const saltRounds = 10;

hash(password, saltRounds).then(h => {
  console.log('New hash:', h);
});