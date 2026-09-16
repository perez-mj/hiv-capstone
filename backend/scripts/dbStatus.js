// backend/scripts/dbStatus.js
require('dotenv').config();
const db = require('../models');

(async () => {
  try {
    const start = Date.now();
    await db.sequelize.authenticate();
    const latency = Date.now() - start;

    const [meta] = await db.sequelize.query(
      'SELECT DATABASE() as db, VERSION() as version'
    );

    console.log('\n=================================');
    console.log('📊 DATABASE STATUS');
    console.log('=================================');
    console.log(`✅ Connection   : OK (${latency}ms)`);
    console.log(`📦 Database     : ${meta[0].db}`);
    console.log(`🐬 MySQL        : ${meta[0].version}`);
    console.log(`🖥️  Host         : ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);

    // Total DB size
    const [size] = await db.sequelize.query(`
      SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
      FROM information_schema.TABLES
      WHERE table_schema = DATABASE()
    `);
    console.log(`💾 Size         : ${size[0].size_mb || 0} MB`);

    // Dynamically discover all models from db object
    console.log('\n---------------------------------');
    console.log('📈 RECORD COUNTS');
    console.log('---------------------------------');

    const models = Object.keys(db).filter(
      (key) => db[key] && typeof db[key].count === 'function' && db[key].rawAttributes
    );

    let totalRecords = 0;
    const rows = [];

    for (const name of models) {
      try {
        const count = await db[name].count();
        totalRecords += count;
        rows.push({ model: name, count });
      } catch (err) {
        rows.push({ model: name, count: 'ERR' });
      }
    }

    // Sort by count descending
    rows.sort((a, b) => (b.count || 0) - (a.count || 0));

    for (const r of rows) {
      const label = r.model.padEnd(22);
      const value = typeof r.count === 'number' ? r.count.toLocaleString().padStart(10) : '      ERR';
      console.log(`  • ${label} ${value}`);
    }

    console.log('---------------------------------');
    console.log(`  ${'TOTAL'.padEnd(22)} ${totalRecords.toLocaleString().padStart(10)}`);
    console.log(`  ${'Tables'.padEnd(22)} ${String(models.length).padStart(10)}`);
    console.log('=================================\n');

    await db.sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ DATABASE STATUS: FAILED');
    console.error(`   ${error.message}\n`);
    process.exit(1);
  }
})();