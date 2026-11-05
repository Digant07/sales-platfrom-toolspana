# Sequential Lead Dialer CRM 🚀

A high-security, distraction-free telecalling CRM web application built specifically for telesales and outbound telecalling teams.

---

## 🔒 Core Security & Anti-Leak Architecture

1. **Zero Contact List Leakage**: Callers (**Agents**) never receive bulk contacts, lead lists, or upcoming leads. 
2. **Strict Single-Lead Dispensing**: The agent API (`/api/agent/current-lead`, `/api/agent/next-lead`) strictly serializes and returns **only 1 record at a time**. Inspecting the browser's DevTools Network tab reveals zero upcoming numbers.
3. **Atomic Concurrency Locking**: Concurrency locking with SQLite (`crm.db`) ensures that when multiple agents click "Get Next Lead" at the same millisecond, two callers *never* receive the same lead, and no lead is ever double-dialed.
4. **Anti-Skipping Persistence**: If an agent has a lead with status `Locked_In_Progress`, refreshing the page always reloads that exact lead first until notes and a disposition are submitted.
5. **Mandatory Note Submission Gate**: Telecallers cannot submit or dispense the next lead without choosing a disposition (`Answered - Interested`, `Answered - Not Interested`, `Call Back Later`, `No Answer / Busy`, `Invalid / Wrong Number`) and providing at least 10 characters in call notes (unless disposition is busy/invalid).

---

## 👥 Built-in User Accounts & Login Credentials

| Role | Username | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Master lead management, file upload, analytics, manual entry, export |
| **Caller 1** | `agent1` | `agent123` | Rajesh Sharma (Telecaller 1) - Single-Lead Workspace |
| **Caller 2** | `agent2` | `agent123` | Priya Patel (Telecaller 2) - Single-Lead Workspace |

*(Quick-fill demo buttons are provided on the Login screen for instant 1-click testing!)*

---

## 🌟 Key Application Features

### 1. Telecaller (Agent) Workspace
- **Start Screen**: Clean interface displaying daily call counters (`Calls Today`, `Interested`, `Follow-ups`, `Queue Remaining`) and a prominent **"Get Next Lead"** button.
- **Mobile Calling Mode**: Large primary **"Call Lead Now"** button (`tel:{phone_number}`) opening the smartphone's native dialer in 1 tap.
- **Desktop-to-Phone QR Dialing**: Renders a scannable QR Code (`tel:{phone_number}`) right next to the number so agents on laptops can point their phone camera and dial instantly without manual typing.
- **Live Call Timer**: Automatically measures talk time in minutes and seconds.
- **Mandatory Notes & Disposition Gate**: Disables next lead dispensing until minimum validation criteria are met.
- **Deal Celebration**: Launches confetti animations when an agent logs a lead as `Answered - Interested`.

### 2. Admin Operations Console
- **Live Analytics & KPIs**: Real-time counter of Total Leads, Remaining in Queue (`Pending`), In Progress (`Locked_In_Progress`), and Completed Calls, with velocity metrics and disposition percentage charts.
- **Excel & CSV Drag-and-Drop Uploader**:
  - Parses `.xlsx`, `.xls`, and `.csv` files using SheetJS (`xlsx`).
  - Previews first 5 rows before importing.
  - Interactive Column Mapper matching spreadsheet headers to CRM fields.
- **Manual Lead Entry**: Form enabling administrators to manually add individual leads to the queue without spreadsheets.
- **Master Lead Queue Table**:
  - Search by business name, phone, town, or custom lead code.
  - Filter by status (`Pending`, `Locked_In_Progress`, `Completed`, `Follow_Up`) and assigned caller.
  - Detailed inspection modal displaying all original spreadsheet columns and caller notes.
  - One-click **"Re-queue to Pending"** button for resetting stuck or abandoned leads.
- **One-Click Excel Export**:
  - Downloads an updated `.xlsx` spreadsheet merging original columns with `call_disposition`, `agent_notes`, `assigned_agent_name`, `called_at`, `follow_up_date`, and duration.
- **Preloaded Catalog Seeder**:
  - One-click button to reload the 29 Rajasthan Industrial / Power Tool leads dataset provided in the catalog.
- **Telecaller Management**:
  - Track live caller status (Online/Offline), current active lead, today's calls, and average duration.
  - Create new caller accounts and toggle active status.

---

## 🛠️ Tech Stack & Directory Structure

- **Backend**: Node.js, Express 5, SQLite (`sqlite3` with WAL mode & atomic transactions), JWT Authentication, bcryptjs, Multer, SheetJS (`xlsx`).
- **Frontend**: React 18, Vite, Tailwind CSS v4, Lucide React, `qrcode.react`, `canvas-confetti`.
- **Database**: `server/crm.db` (Persistent SQLite with indexes on status, agents, and timestamps).

```
Sales Portal/
├── client/                     # Vite + React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.jsx              # Auth screen with quick demo accounts
│   │   │   ├── AgentWorkspace.jsx     # Single-lead workspace & QR dialer
│   │   │   ├── AdminDashboard.jsx     # Admin control center & analytics
│   │   │   └── LeadDetailsModal.jsx   # Detailed lead review modal
│   │   ├── context/
│   │   │   └── AuthContext.jsx        # JWT state management
│   │   ├── api.js                     # Unified API client
│   │   ├── App.jsx                    # Role routing & admin switcher
│   │   └── main.jsx
│   └── package.json
├── server/                     # Express Full-Stack Server & SQLite Database
│   ├── routes/
│   │   ├── auth.js                    # Login & token authentication
│   │   ├── agent.js                   # Atomic single-lead dispensing & note submission
│   │   └── admin.js                   # Excel upload/export, manual entry, analytics
│   ├── middleware/
│   │   └── auth.js                    # JWT verification & role security gates
│   ├── db.js                          # SQLite database connection & schema
│   ├── seed.js                        # Default users & sample leads catalog
│   ├── crm.db                         # SQLite persistent database file
│   └── index.js                       # Express app entry & static SPA server
├── sample_leads_rajasthan.csv  # 29 Rajasthan Industrial Leads for testing upload
└── package.json
```

---

## 🚀 Running the Application

### 1. Start the Server
The application is already running on **http://localhost:5000**.
To run manually at any time from the root directory:
```bash
npm start
```
Open **[http://localhost:5000](http://localhost:5000)** in any desktop or mobile browser.

