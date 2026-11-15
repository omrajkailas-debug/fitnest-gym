# FitNest Gym – Locker Management API

A beginner-friendly REST API for managing gym members, lockers, and current locker allotments. It uses Node.js, Express, and SQLite.

## 1. Architecture and database relationships

The Express application in `app.js` parses JSON requests and mounts one API router for each resource. Route files contain the HTTP endpoints and validation. `database.js` opens the local database, creates tables, enables foreign keys, and inserts starter data. `utils.js` provides shared request-error and ID-validation helpers.

The relationships are:

- One member can have multiple allotments over time.
- Each allotment references one member and one locker.
- `allotments.locker_id` is unique, so a locker can have at most one current allotment. Deleting an allotment releases the locker.
- Deleting a member also deletes that member's allotments through `ON DELETE CASCADE`.
- Lockers are soft-deleted: their row and ID remain in the database, but ordinary locker reads and new allotments exclude them.

## 2. Project files

```text
fitnest-gym/
├── app.js
├── database.js
├── package.json
├── utils.js
├── README.md
├── scripts/
│   └── verifyDatabase.js
└── routes/
    ├── memberRoutes.js
    ├── lockerRoutes.js
    └── allotmentRoutes.js
```

`fitnestGym.db` is created automatically beside `app.js` the first time the server starts. It is intentionally excluded from version control; the schema and sample data are generated from `database.js`.
`database.js` exports `openDatabase()` for startup and `getDatabase()` for the route modules. The server awaits database creation before listening; routes then run their async SQL queries against the same SQLite connection. Sample rows are inserted into the database on first startup and are not used as substitutes for database reads.

## 3. Installation and running

In the VS Code terminal (PowerShell), navigate to the folder containing `package.json`, then run:

```powershell
npm install
npm run dev
```

If setting up the project manually from an empty folder, the initial commands are:

```powershell
mkdir fitnest-gym
cd fitnest-gym
npm init -y
npm install express sqlite3 sqlite
npm install --save-dev nodemon
```

Then add the project files from this guide and run `npm run dev`.

For a normal run without automatic restarts:

```powershell
npm start
```

The API listens at `http://localhost:3000` by default. The root URL returns JSON describing the available API resources. Use `/members`, `/lockers`, or `/allotments` for API requests. To use another port, set the `PORT` environment variable before starting the server.

The first start creates the database and seeds 5 members, 12 lockers, and 4 allotments. The seed uses stable IDs and `INSERT OR IGNORE`, so restarting does not duplicate the sample records.

## Database verification

Run the included verification script to open the real database and print the three tables:

```powershell
npm run db:verify
```

If the SQLite command-line program is installed, you can also query the database directly from the project folder:

```powershell
sqlite3 fitnestGym.db
```

Then execute:

```sql
.headers on
.mode column
SELECT * FROM members;
SELECT * FROM lockers;
SELECT * FROM allotments;
.quit
```

## 4. API conventions

- Send JSON request bodies with the `Content-Type: application/json` header.
- Successful reads, updates, and deletes return `200`.
- Creates return `201`.
- Invalid input returns `400`; missing records return `404`; duplicate email or an already allotted locker returns `409`.
- IDs in URLs must be positive integers.
- Locker lists, locker searches, and individual locker reads include active lockers only.
- All SQL values from requests use SQLite `?` parameters.

### Members

| Method | URL | Purpose |
|---|---|---|
| GET | `/members/` | List all members |
| GET | `/members/:memberId/` | Get one member |
| POST | `/members/` | Create a member |
| PUT | `/members/:memberId/` | Replace member details |
| DELETE | `/members/:memberId/` | Delete a member and their allotments |

Member POST/PUT body:

```json
{
  "member_name": "Nina Shah",
  "email": "nina@example.com",
  "phone": "+91 9876543210"
}
```

`member_name` and a valid unique `email` are required. `phone` is optional; if supplied, it must contain at least seven digits.

### Lockers

| Method | URL | Purpose |
|---|---|---|
| GET | `/lockers/` | List active lockers |
| GET | `/lockers/:lockerId/` | Get one active locker |
| POST | `/lockers/` | Create a locker |
| PUT | `/lockers/:lockerId/` | Update an active locker |
| DELETE | `/lockers/:lockerId/` | Soft-delete a locker |
| POST | `/lockers/:id/restore` | Restore a deleted locker |

Locker POST/PUT body:

```json
{
  "locker_name": "E-01",
  "floor": 2
}
```

`locker_name` cannot be empty; `floor` must be a positive integer. An optional `floor` query parameter filters active lockers, for example `GET /lockers/?floor=2`.

### Allotments

| Method | URL | Purpose |
|---|---|---|
| GET | `/allotments/` | List allotments with their IDs |
| GET | `/allotments/:allotmentId/` | Get one allotment |
| POST | `/allotments/` | Allot an active locker to a member |
| PUT | `/allotments/:allotmentId/` | Update an allotment |
| DELETE | `/allotments/:allotmentId/` | Delete an allotment and release its locker |
| GET | `/allotments/details/` | Get allotments with member and locker names |

POST body (date is optional and defaults to today's date):

```json
{
  "member_id": 5,
  "locker_id": 6,
  "allotted_date": "2026-02-01"
}
```

PUT body requires `member_id` and `locker_id`. `allotted_date` is optional and retains the current date if omitted. Dates must use the valid `YYYY-MM-DD` format. A member must exist, the locker must exist and be active, and a locker already in an allotment cannot be assigned again. SQLite enforces this last rule as well as the application validation.

`GET /allotments/details/` returns `allotment_id`, `member_name`, `locker_name`, `floor`, and `allotted_date` through INNER JOINs.

## 5. Postman testing

Create a Postman environment variable `baseUrl` with value `http://localhost:3000`. For JSON bodies, select **Body → raw → JSON** and set `Content-Type: application/json`.

### Members requests

1. **GET** `{{baseUrl}}/members/` — expected `200`, JSON array of members.
2. **GET** `{{baseUrl}}/members/1/` — expected `200`, member object.
3. **POST** `{{baseUrl}}/members/` with the member body above — expected `201`, created member object.
4. **PUT** `{{baseUrl}}/members/1/` with `{"member_name":"Aarav S.","email":"aarav@example.com","phone":"9876543210"}` — expected `200`, updated member object.
5. **DELETE** `{{baseUrl}}/members/5/` — expected `200`, success message; member allotments are removed too. Run this one last because it removes member 5, which is used by an allotment example below.

### Locker requests

1. **GET** `{{baseUrl}}/lockers/` — expected `200`, active locker array.
2. **GET** `{{baseUrl}}/lockers/1/` — expected `200`, locker object.
3. **GET** `{{baseUrl}}/lockers/?floor=2` — expected `200`, only active lockers on floor 2. Try `floor=1` as well.
4. **POST** `{{baseUrl}}/lockers/` with `{"locker_name":"E-01","floor":2}` — expected `201`.
5. **PUT** `{{baseUrl}}/lockers/6/` with `{"locker_name":"B-06","floor":2}` — expected `200`.
6. **DELETE** `{{baseUrl}}/lockers/12/` — expected `200`; this sets `is_deleted` to `1`, not a physical deletion.
7. **GET** `{{baseUrl}}/lockers/12/` — expected `404` and `{"error":"Locker not found or has been deleted."}`.
8. **GET** `{{baseUrl}}/lockers/` — expected `200`, locker 12 is absent. `GET /lockers/?floor=4` must also exclude it.
9. **POST** `{{baseUrl}}/lockers/12/restore` — expected `200`, restored locker in the response.
10. **GET** `{{baseUrl}}/lockers/12/` — expected `200`, restored locker object.

### Allotment requests

1. **GET** `{{baseUrl}}/allotments/` — expected `200`, allotment array.
2. **GET** `{{baseUrl}}/allotments/1/` — expected `200`, allotment object.
3. **GET** `{{baseUrl}}/allotments/details/` — expected `200`, array containing names, floor, and date.
4. **POST** `{{baseUrl}}/allotments/` with `{"member_id":5,"locker_id":6,"allotted_date":"2026-02-01"}` — expected `201` if locker 6 is available.
5. **PUT** `{{baseUrl}}/allotments/4/` with `{"member_id":4,"locker_id":7,"allotted_date":"2026-02-02"}` — expected `200` if locker 7 is available (as it is in the initial sample data).
6. **DELETE** `{{baseUrl}}/allotments/4/` — expected `200`; its locker is available for a new allotment.

### Validation and error cases

- **GET** `{{baseUrl}}/members/9999/` — expected `404`.
- **GET** `{{baseUrl}}/lockers/not-an-id/` — expected `400`.
- **POST** `{{baseUrl}}/members/` with `{"member_name":"Duplicate","email":"aarav@example.com"}` — expected `409` (sample email already exists).
- **POST** `{{baseUrl}}/members/` with `{"member_name":" ","email":"wrong"}` — expected `400`.
- **POST** `{{baseUrl}}/lockers/` with `{"locker_name":"","floor":0}` — expected `400`.
- **POST** `{{baseUrl}}/allotments/` with `{"member_id":9999,"locker_id":8}` — expected `400` (unknown member).
- **POST** `{{baseUrl}}/allotments/` with `{"member_id":5,"locker_id":1}` — expected `409` (sample locker 1 is already allotted).
- **POST** `{{baseUrl}}/allotments/` with `{"member_id":1,"locker_id":12}` after soft-deleting locker 12 — expected `400`; restore it before trying again.

When re-running requests that create or delete records, check the current database state first: an allotment must use an available locker, and deleting a seeded member also removes their allotment.

## 6. Soft-delete behavior

Deleting a locker sets `is_deleted = 1`. The row remains available for restoration, while normal list, floor-filter, and individual GET endpoints treat the locker as not found. Restoring sets `is_deleted = 0`; the locker then appears in normal reads again. Repeating DELETE or restore is safe and returns `200` if the locker exists.
