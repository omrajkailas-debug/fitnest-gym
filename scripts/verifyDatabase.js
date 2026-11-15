const { openDatabase, getDatabase } = require("../database");

async function verifyDatabase() {
  let db;
  try {
    await openDatabase();
    db = getDatabase();

    for (const table of ["members", "lockers", "allotments"]) {
      const rows = await db.all(`SELECT * FROM ${table};`);
      console.log(`\n${table}:`);
      console.table(rows);
    }

    const foreignKeys = await db.get("PRAGMA foreign_keys;");
    console.log(`\nForeign key enforcement: ${foreignKeys.foreign_keys === 1 ? "ON" : "OFF"}`);
  } finally {
    if (db) {
      await db.close();
    }
  }
}

verifyDatabase().catch((error) => {
  console.error("Could not verify the SQLite database:", error);
  process.exitCode = 1;
});
