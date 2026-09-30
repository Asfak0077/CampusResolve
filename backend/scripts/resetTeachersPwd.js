const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Teacher = require('../src/models/Teacher');
const { requireMongoUri, confirmDestructive } = require('../src/config/env');

async function run() {
  try {
    confirmDestructive('reset every teacher password');
    await mongoose.connect(requireMongoUri());
    const newPassword = process.env.TEACHER_DEFAULT_PASSWORD || 'teach123';
    const newHash = await bcrypt.hash(newPassword, 10);
    const res = await Teacher.updateMany({}, { passwordHash: newHash, isPasswordSet: true });
    console.log(`Updated ${res.modifiedCount} teacher password(s).`);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
run();
