import 'dotenv/config';
import { URL } from 'node:url';

const value = process.env.TEST_DATABASE_URL;
if (!value) throw new Error('Set TEST_DATABASE_URL to a dedicated disposable PostgreSQL database.');
const testUrl = new URL(value);
const databaseName = decodeURIComponent(testUrl.pathname.slice(1));
if (!databaseName.endsWith('_test')) {
  throw new Error(
    'TEST_DATABASE_URL must point to a dedicated disposable database whose name ends in _test.',
  );
}
console.log(`Using isolated integration database ${databaseName}.`);
