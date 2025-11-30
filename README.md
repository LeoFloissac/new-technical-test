# 📘 Selego – Technical Test  
Project Budget Tracker

## 📝 Overview

This project is an implementation of the Selego technical test.  
It allows users to:

- Create and manage projects with budgets  
- Add expenses to projects  
- View budget status  
- Receive email alerts when a project goes over budget  

Built on top of the provided boilerplate (authentication, API structure, file upload, email service).

---

## 🚀 How to Run

### Backend
1. Go to the backend folder:
cd api
2. Install dependencies:
npm install
3. Start the development server:
npm run dev


### Frontend
1. Go to the frontend folder:
cd app
2. Install dependencies:
npm install
3. Start the development server:
npm run dev

Backend → http://localhost:8080  
Frontend → http://localhost:3000

---

## 📂 Features Implemented

### ✅ Project Management
- Create projects (name + budget)  
- View all projects  
- Delete projects  

### ✅ Expenses
- Add expenses to a project  
- View all expenses of a project  

### ✅ Budget Alerts (Email)
Emails are sent using **Brevo** when a project exceeds its budget:

- For the **first time**  
- Or if the **last alert was sent more than 1 week ago**  

This check happens at **each expense creation**.

### ❌ AI Feature
Not implemented due to lack of time and cost concerns with LLM calls.

---

## 🗃️ Data Models

### Project
- name: String (required)  
- budget: Number (required)  
- notifiedOverBudget: Boolean (default: false)  
- lastOverBudgetNotifiedAt: Date (default: null)  
- createdAt: Date  
- updatedAt: Date  

### Expense
- projectId: ObjectId (ref: 'project', required)  
- amount: Number (required)  
- category: String (default: 'uncategorized')  
- description: String (default: '')  
- date: Date (default: now)  

### Project Member
- projectId: ObjectId (ref: 'project', required)  
- userId: ObjectId (ref: 'user', required)  
- createdAt: Date  
- updatedAt: Date  

---

## 🔌 API Structure

### User Routes (`/api/user`)
- `POST /signup` → register a new user  
- `POST /signin` → login and get JWT  
- `POST /logout` → clear session cookie  
- `POST /forgot_password` → request password reset  
- `POST /forgot_password_reset` → reset password using token  
- `POST /reset_password` → change password (authenticated)  
- `GET /signin_token` → refresh JWT (authenticated)  
- `GET /:id` → get user by ID  
- `GET /` → list all normal users (authenticated)  
- `POST /search` → search users with pagination and sorting (authenticated)  
- `POST /` → create user (admin only)  
- `PUT /:id` → update user by ID (authenticated)  
- `PUT /` → update current authenticated user  
- `DELETE /:id` → delete user (admin only)  

### Project Routes (`/api/project`)
- `GET /` → list all projects the current user belongs to  
- `GET /:id` → get a specific project (user must be member)  
- `POST /` → create a project and add creator as member  
- `DELETE /:id` → delete a project (user must be member)  
- `POST /:id/users` → add a user to a project by email (current user must be member)  
- `GET /:id/users` → list all users in a project (current user must be member)  

### Expense Routes (`/api/expense`)
- `GET /project/:projectId` → get all expenses of a project (user must be member)  
- `POST /project/:projectId` → add an expense to a project (user must be member)  
  - Sends email alerts if the project goes over budget for the first time, or if the last notification was more than 1 week ago  
- `DELETE /:id` → delete an expense (user must be member of related project)  
- `GET /project/:projectId/total` → get total sum of expenses for a project (user must be member)  

**Note:** All responses follow the `{ ok, data }` / `{ ok, error }` pattern.

---

## 🖥️ Frontend Overview

The frontend is a **React application** with the following pages/components:

- **Projects List:** view all projects and budget status  
- **Project Detail:** see all expenses, total spent, and add new expenses  
- **Add Project / Add Expense Forms:** simple forms with validation  
- **User Management:** optional feature to add users to projects  
- **Budget Alerts:** displays visual alert when a project exceeds its budget  

UI is functional and clean; the focus was on usability over styling.

---

## ⏱️ Time Spent

- Backend (API, schemas, mail logic): ~1h40  
- Frontend (UI + integration): ~1h10  
- Setup & testing: ~10 min  

**Total ≈ 3 hours**

---

## 📌 Possible Improvements with More Time

- Improve UI/UX (modals, filters, sorting)  
- Optional AI feature for expense categorization or suggestions  
- Charts for budget visualization
