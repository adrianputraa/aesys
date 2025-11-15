import bcrypt from 'bcrypt';

const saltRounds = 10;

async function hashString(value: string) {
  const hashedStr = await bcrypt.hash(value, saltRounds);
  return hashedStr;
}

async function compareString(value: string, referenceHash: string) {
  const isMatch = await bcrypt.compare(value, referenceHash);
  return isMatch;
}

export { hashString, compareString };
