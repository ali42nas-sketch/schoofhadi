import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("exams.db");

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL DEFAULT '123456'
  );
`);

// Migration: Add password column if it doesn't exist (for existing databases)
try {
  db.prepare("SELECT password FROM users LIMIT 1").get();
} catch (e) {
  console.log("Adding password column to users table...");
  db.exec("ALTER TABLE users ADD COLUMN password TEXT NOT NULL DEFAULT '123456'");
}

// Migration: Add location column to rooms
try {
  db.prepare("SELECT location FROM rooms LIMIT 1").get();
} catch (e) {
  console.log("Adding location column to rooms table...");
  db.exec("ALTER TABLE rooms ADD COLUMN location TEXT");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    location TEXT
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    academic_id TEXT UNIQUE NOT NULL,
    grade TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    quota INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS distributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    room_id INTEGER,
    exam_id INTEGER,
    FOREIGN KEY(student_id) REFERENCES students(id),
    FOREIGN KEY(room_id) REFERENCES rooms(id),
    FOREIGN KEY(exam_id) REFERENCES exams(id)
  );

  CREATE TABLE IF NOT EXISTS proctor_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER,
    room_id INTEGER,
    exam_id INTEGER,
    FOREIGN KEY(teacher_id) REFERENCES teachers(id),
    FOREIGN KEY(room_id) REFERENCES rooms(id),
    FOREIGN KEY(exam_id) REFERENCES exams(id)
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    exam_id INTEGER,
    status TEXT DEFAULT 'absent',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_id) REFERENCES students(id),
    FOREIGN KEY(exam_id) REFERENCES exams(id)
  );
`);

// Seed data if empty
const roomCount = db.prepare("SELECT COUNT(*) as count FROM rooms").get() as { count: number };
if (roomCount.count === 0) {
  db.prepare("INSERT INTO rooms (name, capacity) VALUES (?, ?)").run("القاعة الكبرى", 30);
  db.prepare("INSERT INTO rooms (name, capacity) VALUES (?, ?)").run("مختبر الحاسب", 20);
  db.prepare("INSERT INTO rooms (name, capacity) VALUES (?, ?)").run("القاعة 101", 15);

  db.prepare("INSERT INTO students (name, academic_id, grade) VALUES (?, ?, ?)").run("أحمد محمد", "1001", "العاشر");
  db.prepare("INSERT INTO students (name, academic_id, grade) VALUES (?, ?, ?)").run("سارة أحمد", "1002", "العاشر");
  db.prepare("INSERT INTO students (name, academic_id, grade) VALUES (?, ?, ?)").run("خالد وليد", "1003", "العاشر");

  db.prepare("INSERT INTO teachers (name, subject) VALUES (?, ?)").run("أ. عبدالله", "الرياضيات");
  db.prepare("INSERT INTO teachers (name, subject) VALUES (?, ?)").run("أ. ليلى", "اللغة العربية");

  db.prepare("INSERT INTO exams (subject, date, start_time) VALUES (?, ?, ?)").run("الرياضيات", "2026-02-25", "08:00");
}

const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  db.prepare("INSERT INTO users (name, role, username, password) VALUES (?, ?, ?, ?)").run("المدير العام", "مدير", "1027594579", "admin123");
  db.prepare("INSERT INTO users (name, role, username, password) VALUES (?, ?, ?, ?)").run("سارة الكنترول", "عضو كنترول", "control1", "123456");
  db.prepare("INSERT INTO users (name, role, username, password) VALUES (?, ?, ?, ?)").run("أ. محمد المراقب", "مراقب", "proctor1", "123456");
} else {
  // Ensure the specific admin exists and has the correct password
  const mainAdmin = db.prepare("SELECT * FROM users WHERE username = ?").get("1027594579") as any;
  if (!mainAdmin) {
    db.prepare("INSERT INTO users (name, role, username, password) VALUES (?, ?, ?, ?)").run("المدير العام", "مدير", "1027594579", "admin123");
  } else if (mainAdmin.password !== 'admin123') {
    db.prepare("UPDATE users SET password = ? WHERE username = ?").run("admin123", "1027594579");
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/stats", (req, res) => {
    const totalStudents = db.prepare("SELECT COUNT(*) as count FROM students").get() as any;
    const totalRooms = db.prepare("SELECT COUNT(*) as count FROM rooms").get() as any;
    const presentToday = db.prepare("SELECT COUNT(*) as count FROM attendance WHERE status = 'present'").get() as any;
    res.json({
      totalStudents: totalStudents.count,
      totalRooms: totalRooms.count,
      presentToday: presentToday.count,
      absentToday: totalStudents.count - presentToday.count
    });
  });

  app.get("/api/rooms", (req, res) => {
    const rooms = db.prepare("SELECT * FROM rooms").all();
    res.json(rooms);
  });

  app.post("/api/rooms", (req, res) => {
    const { name, capacity, location } = req.body;
    const result = db.prepare("INSERT INTO rooms (name, capacity, location) VALUES (?, ?, ?)").run(name, capacity, location);
    res.json({ id: result.lastInsertRowid, name, capacity, location });
  });

  app.put("/api/rooms/:id", (req, res) => {
    const { id } = req.params;
    const { name, capacity, location } = req.body;
    db.prepare("UPDATE rooms SET name = ?, capacity = ?, location = ? WHERE id = ?").run(name, capacity, location, id);
    res.json({ success: true });
  });

  app.delete("/api/rooms/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM rooms WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/rooms/occupancy", (req, res) => {
    const occupancy = db.prepare(`
      SELECT r.id, r.name, r.capacity, COUNT(d.student_id) as current_occupancy
      FROM rooms r
      LEFT JOIN distributions d ON r.id = d.room_id
      GROUP BY r.id
    `).all();
    res.json(occupancy);
  });

  app.get("/api/students", (req, res) => {
    const students = db.prepare("SELECT * FROM students").all();
    res.json(students);
  });

  app.post("/api/students", (req, res) => {
    const { name, academic_id, grade } = req.body;
    try {
      const result = db.prepare("INSERT INTO students (name, academic_id, grade) VALUES (?, ?, ?)").run(name, academic_id, grade);
      res.json({ id: result.lastInsertRowid, name, academic_id, grade });
    } catch (err) {
      res.status(400).json({ error: "الرقم الأكاديمي موجود مسبقاً" });
    }
  });

  app.put("/api/students/:id", (req, res) => {
    const { id } = req.params;
    const { name, academic_id, grade } = req.body;
    db.prepare("UPDATE students SET name = ?, academic_id = ?, grade = ? WHERE id = ?").run(name, academic_id, grade, id);
    res.json({ success: true });
  });

  app.delete("/api/students/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM students WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.post("/api/students/bulk", (req, res) => {
    const students = req.body;
    const insert = db.prepare("INSERT OR REPLACE INTO students (name, academic_id, grade) VALUES (?, ?, ?)");
    const transaction = db.transaction((data) => {
      for (const student of data) {
        insert.run(student.name, student.academic_id, student.grade);
      }
    });
    transaction(students);
    res.json({ success: true, count: students.length });
  });

  app.post("/api/rooms/bulk", (req, res) => {
    const rooms = req.body;
    const insert = db.prepare("INSERT OR REPLACE INTO rooms (name, capacity, location) VALUES (?, ?, ?)");
    const transaction = db.transaction((data) => {
      for (const room of data) {
        insert.run(room.name, room.capacity, room.location);
      }
    });
    transaction(rooms);
    res.json({ success: true, count: rooms.length });
  });

  app.get("/api/users", (req, res) => {
    const users = db.prepare("SELECT id, name, role, username FROM users").all();
    res.json(users);
  });

  app.post("/api/users", (req, res) => {
    const { name, role, username, password } = req.body;
    try {
      const result = db.prepare("INSERT INTO users (name, role, username, password) VALUES (?, ?, ?, ?)").run(name, role, username, password || '123456');
      res.json({ id: result.lastInsertRowid, name, role, username });
    } catch (err) {
      res.status(400).json({ error: "اسم المستخدم موجود مسبقاً" });
    }
  });

  app.put("/api/users/:id", (req, res) => {
    const { id } = req.params;
    const { name, role, username, password } = req.body;
    try {
      if (password) {
        db.prepare("UPDATE users SET name = ?, role = ?, username = ?, password = ? WHERE id = ?").run(name, role, username, password, id);
      } else {
        db.prepare("UPDATE users SET name = ?, role = ?, username = ? WHERE id = ?").run(name, role, username, id);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: "خطأ في التحديث" });
    }
  });

  app.delete("/api/users/:id", (req, res) => {
    const { id } = req.params;
    // Don't allow deleting the main admin
    const user = db.prepare("SELECT username FROM users WHERE id = ?").get(id) as any;
    if (user?.username === '1027594579') {
      return res.status(403).json({ error: "لا يمكن حذف المدير العام" });
    }
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.post("/api/login", (req, res) => {
    console.log("Login attempt:", req.body.username);
    const { username, password } = req.body;
    try {
      const user = db.prepare("SELECT id, name, role, username FROM users WHERE username = ? AND password = ?").get(username, password);
      if (user) {
        console.log("Login success:", username);
        res.json(user);
      } else {
        console.log("Login failed: Invalid credentials for", username);
        res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }
    } catch (err) {
      console.error("Database error during login:", err);
      res.status(500).json({ error: "خطأ في قاعدة البيانات" });
    }
  });

  app.post("/api/logistics/deliver", (req, res) => {
    const { room_id, receiver_name } = req.body;
    const time = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    // In a real app, we'd update a table. For now, we'll just return success.
    res.json({ success: true, time, receiver_name });
  });

  app.post("/api/attendance/mark", (req, res) => {
    const { student_id, exam_id, status } = req.body;
    db.prepare("INSERT OR REPLACE INTO attendance (student_id, exam_id, status) VALUES (?, ?, ?)").run(student_id, exam_id, status);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
