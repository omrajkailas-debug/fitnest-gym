const express = require("express");
const { getDatabase } = require("../database");
const { asyncHandler, HttpError, parseId, requireObjectBody } = require("../utils");

const router = express.Router();

function validateLocker(body) {
  requireObjectBody(body);
  const lockerName = typeof body.locker_name === "string" ? body.locker_name.trim() : "";
  const floor = Number(body.floor);
  if (!lockerName) {
    throw new HttpError(400, "locker_name is required and cannot be empty.");
  }
  if (!Number.isInteger(floor) || floor <= 0) {
    throw new HttpError(400, "floor must be a positive integer.");
  }
  return { lockerName, floor };
}

router.get("/", asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { floor } = req.query;
  let lockers;

  if (floor !== undefined) {
    if (!/^[1-9]\d*$/.test(floor)) {
      throw new HttpError(400, "floor must be a positive integer.");
    }
    lockers = await db.all(
      "SELECT locker_id, locker_name, floor FROM lockers WHERE is_deleted = 0 AND floor = ? ORDER BY locker_id",
      Number(floor),
    );
  } else {
    lockers = await db.all(
      "SELECT locker_id, locker_name, floor FROM lockers WHERE is_deleted = 0 ORDER BY locker_id",
    );
  }
  res.json(lockers);
}));

router.get("/:lockerId", asyncHandler(async (req, res) => {
  const db = getDatabase();
  const lockerId = parseId(req.params.lockerId, "lockerId");
  const locker = await db.get(
    "SELECT locker_id, locker_name, floor FROM lockers WHERE locker_id = ? AND is_deleted = 0",
    lockerId,
  );
  if (!locker) {
    throw new HttpError(404, "Locker not found or has been deleted.");
  }
  res.json(locker);
}));

router.post("/", asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { lockerName, floor } = validateLocker(req.body);
  const result = await db.run(
    "INSERT INTO lockers (locker_name, floor) VALUES (?, ?)",
    [lockerName, floor],
  );
  const locker = await db.get(
    "SELECT locker_id, locker_name, floor FROM lockers WHERE locker_id = ?",
    result.lastID,
  );
  res.status(201).json(locker);
}));

router.put("/:lockerId", asyncHandler(async (req, res) => {
  const db = getDatabase();
  const lockerId = parseId(req.params.lockerId, "lockerId");
  const { lockerName, floor } = validateLocker(req.body);
  const result = await db.run(
    "UPDATE lockers SET locker_name = ?, floor = ? WHERE locker_id = ? AND is_deleted = 0",
    [lockerName, floor, lockerId],
  );
  if (result.changes === 0) {
    throw new HttpError(404, "Locker not found or has been deleted.");
  }
  const locker = await db.get(
    "SELECT locker_id, locker_name, floor FROM lockers WHERE locker_id = ?",
    lockerId,
  );
  res.json(locker);
}));

router.delete("/:lockerId", asyncHandler(async (req, res) => {
  const db = getDatabase();
  const lockerId = parseId(req.params.lockerId, "lockerId");
  const locker = await db.get("SELECT locker_id FROM lockers WHERE locker_id = ?", lockerId);
  if (!locker) {
    throw new HttpError(404, "Locker not found.");
  }
  await db.run("UPDATE lockers SET is_deleted = 1 WHERE locker_id = ?", lockerId);
  res.json({ message: "Locker deleted successfully." });
}));

router.post("/:id/restore", asyncHandler(async (req, res) => {
  const db = getDatabase();
  const lockerId = parseId(req.params.id, "lockerId");
  const locker = await db.get("SELECT locker_id FROM lockers WHERE locker_id = ?", lockerId);
  if (!locker) {
    throw new HttpError(404, "Locker not found.");
  }
  await db.run("UPDATE lockers SET is_deleted = 0 WHERE locker_id = ?", lockerId);
  const restoredLocker = await db.get(
    "SELECT locker_id, locker_name, floor FROM lockers WHERE locker_id = ?",
    lockerId,
  );
  res.json({ message: "Locker restored successfully.", locker: restoredLocker });
}));

module.exports = router;
