require("dotenv").config();

const express = require("express");
const { openDatabase } = require("./database");
const memberRoutes = require("./routes/memberRoutes");
const lockerRoutes = require("./routes/lockerRoutes");
const allotmentRoutes = require("./routes/allotmentRoutes");
const { HttpError } = require("./utils");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    name: "FitNest Gym API",
    endpoints: ["/members", "/lockers", "/allotments"],
  });
});

app.use("/members", memberRoutes);
app.use("/lockers", lockerRoutes);
app.use("/allotments", allotmentRoutes);

app.use((req, res, next) => {
  next(new HttpError(404, "API endpoint not found."));
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ error: "Request body must contain valid JSON." });
  }

  if (error.code === "SQLITE_CONSTRAINT_UNIQUE"
      || (error.code === "SQLITE_CONSTRAINT" && error.message.includes("UNIQUE constraint failed"))) {
    const message = error.message.includes("members.email")
      ? "A member with this email already exists."
      : "This locker is already allotted.";
    return res.status(409).json({ error: message });
  }

  if (error.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
    return res.status(400).json({ error: "The requested related record does not exist." });
  }

  const status = Number.isInteger(error.status) ? error.status : 500;
  const message = status === 500 ? "Internal server error." : error.message;
  if (status === 500) {
    console.error(error);
  }
  return res.status(status).json({ error: message });
});

async function initializeDBAndServer() {
  try {
    await openDatabase();
    const port = Number(process.env.PORT) || 3000;
    app.listen(port, () => {
      console.log(`FitNest Gym API is running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Could not initialize the database or start the server:", error);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  initializeDBAndServer();
}

module.exports = { app, initializeDBAndServer };
