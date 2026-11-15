const express = require("express");
const { getDatabase } = require("../database");
const { asyncHandler, HttpError, parseId, requireObjectBody } = require("../utils");

const router = express.Router();

async function validateReferences(db, memberId, lockerId) {
  const member = await db.get("SELECT member_id FROM members WHERE member_id = ?", memberId);
  if (!member) {
    throw new HttpError(400, "member_id does not match an existing member.");
  }
  const locker = await db.get(
    "SELECT locker_id FROM lockers WHERE locker_id = ? AND is_deleted = 0",
    lockerId,
  );
  if (!locker) {
    throw new HttpError(400, "locker_id does not match an active locker.");
  }
}

function validateDate(value, fallback) {
  const date = value == null ? fallback : value;
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new HttpError(400, "allotted_date must be a date in YYYY-MM-DD format.");
  }
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new HttpError(400, "allotted_date must be a valid calendar date.");
  }
  return date;
}

router.get("/details", asyncHandler(async (req, res) => {
  const db = getDatabase();
  const details = await db.all(`
    SELECT a.allotment_id, m.member_name, l.locker_name, l.floor, a.allotted_date
    FROM allotments AS a
    INNER JOIN members AS m ON m.member_id = a.member_id
    INNER JOIN lockers AS l ON l.locker_id = a.locker_id
    ORDER BY a.allotment_id
  `);
  res.json(details);
}));

router.get("/", asyncHandler(async (req, res) => {
  const db = getDatabase();
  const allotments = await db.all("SELECT * FROM allotments ORDER BY allotment_id");
  res.json(allotments);
}));

router.get("/:allotmentId", asyncHandler(async (req, res) => {
  const db = getDatabase();
  const allotmentId = parseId(req.params.allotmentId, "allotmentId");
  const allotment = await db.get(
    "SELECT * FROM allotments WHERE allotment_id = ?",
    allotmentId,
  );
  if (!allotment) {
    throw new HttpError(404, "Allotment not found.");
  }
  res.json(allotment);
}));

router.post("/", asyncHandler(async (req, res) => {
  const db = getDatabase();
  const body = requireObjectBody(req.body);
  const memberId = Number(body.member_id);
  const lockerId = Number(body.locker_id);
  if (!Number.isInteger(memberId) || memberId <= 0
      || !Number.isInteger(lockerId) || lockerId <= 0) {
    throw new HttpError(400, "member_id and locker_id must be positive integers.");
  }
  const allottedDate = validateDate(body.allotted_date, new Date().toISOString().slice(0, 10));
  await validateReferences(db, memberId, lockerId);
  const result = await db.run(
    `INSERT INTO allotments (member_id, locker_id, allotted_date)
     VALUES (?, ?, ?)`,
    [memberId, lockerId, allottedDate],
  );
  const allotment = await db.get(
    "SELECT * FROM allotments WHERE allotment_id = ?",
    result.lastID,
  );
  res.status(201).json(allotment);
}));

router.put("/:allotmentId", asyncHandler(async (req, res) => {
  const db = getDatabase();
  const body = requireObjectBody(req.body);
  const allotmentId = parseId(req.params.allotmentId, "allotmentId");
  const current = await db.get(
    "SELECT * FROM allotments WHERE allotment_id = ?",
    allotmentId,
  );
  if (!current) {
    throw new HttpError(404, "Allotment not found.");
  }

  const memberId = Number(body.member_id);
  const lockerId = Number(body.locker_id);
  if (!Number.isInteger(memberId) || memberId <= 0
      || !Number.isInteger(lockerId) || lockerId <= 0) {
    throw new HttpError(400, "member_id and locker_id must be positive integers.");
  }
  const allottedDate = validateDate(body.allotted_date, current.allotted_date);
  await validateReferences(db, memberId, lockerId);
  await db.run(
    `UPDATE allotments
     SET member_id = ?, locker_id = ?, allotted_date = ?
     WHERE allotment_id = ?`,
    [memberId, lockerId, allottedDate, allotmentId],
  );
  const allotment = await db.get(
    "SELECT * FROM allotments WHERE allotment_id = ?",
    allotmentId,
  );
  res.json(allotment);
}));

router.delete("/:allotmentId", asyncHandler(async (req, res) => {
  const db = getDatabase();
  const allotmentId = parseId(req.params.allotmentId, "allotmentId");
  const result = await db.run(
    "DELETE FROM allotments WHERE allotment_id = ?",
    allotmentId,
  );
  if (result.changes === 0) {
    throw new HttpError(404, "Allotment not found.");
  }
  res.json({ message: "Allotment deleted successfully; the locker is available again." });
}));

module.exports = router;
