// backend/scripts/dropDb.js
require('dotenv').config();
const db = require('../models');

class DatabaseDropper {
  async run() {
    try {
      console.log('\n=================================');
      console.log('Database Drop Started');
      console.log('=================================\n');

      const dbName = process.env.DB_NAME || '(unknown)';
      const dbHost = process.env.DB_HOST || 'localhost';
      const dbUser = process.env.DB_USER || 'root';

      console.log(`Target database: ${dbName}`);
      console.log(`Host: ${dbHost}`);
      console.log(`User: ${dbUser}\n`);

      // Safety confirmation unless --force flag is passed
      const force = process.argv.includes('--force') || process.argv.includes('-f');
      if (!force) {
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });

        const answer = await new Promise((resolve) => {
          readline.question(
            `⚠️  This will PERMANENTLY DROP the database "${dbName}".\n` +
            `Proceed? (yes/No): `,
            resolve
          );
        });
        readline.close();

        if (answer.trim() !== 'yes') {
          console.log('\n❌ Confirmation failed. Aborting.');
          process.exit(1);
        }
      }

      // Step 1: Close all connections
      console.log('Closing existing connections...');
      await db.sequelize.close();
      console.log('✓ Connections closed\n');

      // Step 2: Create a fresh connection (without specifying a database)
      const mysql = require('mysql2/promise');
      const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true
      });

      console.log(`Dropping database "${dbName}"...`);
      await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
      console.log(`✓ Database "${dbName}" dropped\n`);

      console.log('Recreating empty database...');
      await connection.query(
        `CREATE DATABASE \`${dbName}\` 
         CHARACTER SET utf8mb4 
         COLLATE utf8mb4_unicode_ci`
      );
      console.log(`✓ Database "${dbName}" recreated (empty)\n`);

      await connection.end();

      console.log('=================================');
      console.log('Database Drop Complete!');
      console.log('=================================');
      console.log('\n💡 Next steps:');
      console.log('   • Run "npm run dev:init" to re-initialize with seed data');
      console.log('   • Or run "npm run migrate" to apply migrations\n');

      process.exit(0);
    } catch (error) {
      console.error('\n❌ Error dropping database:', error);
      process.exit(1);
    }
  }
}

new DatabaseDropper().run();