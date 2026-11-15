const express = require("express");
const { getDatabase } = require("../database");
const { asyncHandler, HttpError, parseId, requireObjectBody } = require("../utils");

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[\d\s()-]{7,20}$/;

function validateMember(body) {
  requireObjectBody(body);
  const name = typeof body.member_name === "string" ? body.member_name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const phone = body.phone == null ? null : String(body.phone).trim();

  if (!name || !email) {
    throw new HttpError(400, "member_name and email are required.");
  }
  if (!emailPattern.test(email)) {
    throw new HttpError(400, "Enter a valid email address.");
  }
  if (phone && (!phonePattern.test(phone) || (phone.match(/\d/g) || []).length < 7)) {
    throw new HttpError(400, "Enter a valid phone number with at least 7 digits.");
  }
  return { name, email, phone: phone || null };
}

router.get("/", asyncHandler(async (req, res) => {
  const db = getDatabase();
  const members = await db.all("SELECT * FROM members ORDER BY member_id");
  res.json(members);
}));

router.get("/:memberId", asyncHandler(async (req, res) => {
  const db = getDatabase();
  const memberId = parseId(req.params.memberId, "memberId");
  const member = await db.get("SELECT * FROM members WHERE member_id = ?", memberId);
  if (!member) {
    throw new HttpError(404, "Member not found.");
  }
  res.json(member);
}));

router.post("/", asyncHandler(async (req, res) => {
  const db = getDatabase();
  const { name, email, phone } = validateMember(req.body);
  const result = await db.run(
    "INSERT INTO members (member_name, email, phone) VALUES (?, ?, ?)",
    [name, email, phone],
  );
  const member = await db.get("SELECT * FROM members WHERE member_id = ?", result.lastID);
  res.status(201).json(member);
}));

router.put("/:memberId", asyncHandler(async (req, res) => {
  const db = getDatabase();
  const memberId = parseId(req.params.memberId, "memberId");
  const { name, email, phone } = validateMember(req.body);
  const result = await db.run(
    `UPDATE members SET member_name = ?, email = ?, phone = ?
     WHERE member_id = ?`,
    [name, email, phone, memberId],
  );
  if (result.changes === 0) {
    throw new HttpError(404, "Member not found.");
  }
  const member = await db.get("SELECT * FROM members WHERE member_id = ?", memberId);
  res.json(member);
}));

router.delete("/:memberId", asyncHandler(async (req, res) => {
  const db = getDatabase();
  const memberId = parseId(req.params.memberId, "memberId");
  const result = await db.run("DELETE FROM members WHERE member_id = ?", memberId);
  if (result.changes === 0) {
    throw new HttpError(404, "Member not found.");
  }
  res.json({ message: "Member and their allotments deleted successfully." });
}));

module.exports = router;
