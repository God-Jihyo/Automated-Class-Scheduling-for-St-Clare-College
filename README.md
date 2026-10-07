# Automated Class Scheduling & Calendar Management System

A web-based scheduling and academic calendar application designed to streamline class assignments, manage room distributions, detect scheduling conflicts in real time, and handle automated user email notifications.

---

## Live Demo

**Live Web Application:** [https://sean-thesis.ifree.page](https://sean-thesis.ifree.page)

---

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3, JavaScript (Vanilla ES6)
* **Backend:** PHP, PHPMailer
* **Database:** MySQL
* **Authentication & Email:** 2-Factor Authentication (2FA), Gmail SMTP / REST API
* **Development & Hosting:** Laragon (Local Environment), InfinityFree (Production Hosting)

---

## ✨ Key Features

* **Automated Scheduling Engine:** Generates optimized timetables and flags overlapping faculty or room conflicts.
* **Centralized Academic Calendar:** View and publish key institution dates, deadlines, and real-time announcements.
* **Email & 2FA Notifications:** Integrates PHPMailer for automated account verification, two-factor authentication, and system alerts.
* **Role-Based Access Control:** Distinct interfaces and permissions for administrators, faculty, and students.
* **Interactive Dashboard:** Clean, responsive UI for managing users, courses, classrooms, and time slots.

---

## Notes:
* Update db_connection.php with your database credentials
* Update sendemail.php with your own email and password
* To access admin page: Username:  admin@123 Password: admin123

## 📂 Project Structure

```text
├── api/             # Backend API routes and data handlers
├── app/             # Application controllers and business logic
├── assets/          # Static assets (images, CSS styles, JS scripts)
├── config/          # Database & mailer configuration templates
├── vendor/          # Dependencies / third-party libraries (PHPMailer)
├── thesis.sql       # Database schema export
├── index.html       # Application entry point / landing page
└── db_connection.php # Database connection script
d
