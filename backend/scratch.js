require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/user.model');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vardhan');
  const hrUser = await User.findOne({ role: 'hr' }).lean();
  console.log(JSON.stringify(hrUser, null, 2));
  process.exit(0);
}
run();
