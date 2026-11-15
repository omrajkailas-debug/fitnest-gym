const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const databasePath = path.join(__dirname, "fitnestGym.db");
let database;

async function openDatabase() {
  if (database) {
    return database;
  }

  const db = await open({
    filename: databasePath,
    driver: sqlite3.Database,
  });

  await db.exec("PRAGMA foreign_keys = ON;");

  await db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      member_id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT
    );

    CREATE TABLE IF NOT EXISTS lockers (
      locker_id INTEGER PRIMARY KEY AUTOINCREMENT,
      locker_name TEXT NOT NULL,
      floor INTEGER NOT NULL CHECK (floor > 0),
      is_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0, 1))
    );

    CREATE TABLE IF NOT EXISTS allotments (
      allotment_id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      locker_id INTEGER NOT NULL UNIQUE,
      allotted_date TEXT NOT NULL,
      FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
      FOREIGN KEY (locker_id) REFERENCES lockers(locker_id)
    );
  `);

  await seedSampleData(db);
  database = db;
  return database;
}

function getDatabase() {
  if (!database) {
    throw new Error("The database connection has not been initialized.");
  }
  return database;
}

async function seedSampleData(db) {
  const members = [
    [1, "Aarav Sharma", "aarav@example.com", "9876543210"],
    [2, "Diya Patel", "diya@example.com", "9876543211"],
    [3, "Kabir Rao", "kabir@example.com", "9876543212"],
    [4, "Meera Nair", "meera@example.com", "9876543213"],
    [5, "Ishaan Das", "ishaan@example.com", "9876543214"],
  ];

  const lockers = [
    [1, "A-01", 1], [2, "A-02", 1], [3, "A-03", 1],
    [4, "B-01", 2], [5, "B-02", 2], [6, "B-03", 2],
    [7, "C-01", 3], [8, "C-02", 3], [9, "C-03", 3],
    [10, "D-01", 4], [11, "D-02", 4], [12, "D-03", 4],
  ];

  const allotments = [
    [1, 1, 1, "2026-01-10"],
    [2, 2, 2, "2026-01-11"],
    [3, 3, 4, "2026-01-12"],
    [4, 4, 5, "2026-01-13"],
  ];

  for (const member of members) {
    await db.run(
      `INSERT OR IGNORE INTO members (member_id, member_name, email, phone)
       VALUES (?, ?, ?, ?)`,
      member,
    );
  }

  for (const locker of lockers) {
    await db.run(
      `INSERT OR IGNORE INTO lockers (locker_id, locker_name, floor)
       VALUES (?, ?, ?)`,
      locker,
    );
  }

  for (const allotment of allotments) {
    await db.run(
      `INSERT OR IGNORE INTO allotments
       (allotment_id, member_id, locker_id, allotted_date)
       VALUES (?, ?, ?, ?)`,
      allotment,
    );
  }
}

module.exports = { openDatabase, getDatabase };
