# Vendor Management Mini-Portal

This project is a full-stack web module designed as a hiring task for QuickSO. It provides a platform for vendors to register, showcase their products, and receive client feedback and ratings, with a basic administrative view for monitoring.

**🚀 Overview**

The application is structured into two main services: a Node.js/Express API that manages data persistence and business logic, and a React SPA (Single Page Application) for the user interface.

## Key Features Implemented

- **Vendor Registration**: Secure sign-up with password hashing and validation.
  <img width="1918" height="1022" alt="VM2" src="https://github.com/user-attachments/assets/fe588f7e-53ce-4727-929b-a08824e3ff7e" />

- **Vendor Login & Dashboard**: Authenticated access to view profile summary and manage products.
  <img width="1917" height="1027" alt="VM3" src="https://github.com/user-attachments/assets/b3c70fc5-ea03-4df1-9627-55680120800c" />
  <img width="1912" height="1030" alt="VM5" src="https://github.com/user-attachments/assets/e3c389bc-20ed-4e11-ac49-f880aeb9c581" />

- **Vendor Product Showcase**: Unique public-facing displaying vendor profile and product listings.
  <img width="1917" height="1028" alt="VM8" src="https://github.com/user-attachments/assets/bc728b41-813f-4dce-96ff-bdb52ea4091b" />

- **Product Management (CRUD)**: Protected vendor dashboard functions for adding, editing, and deleting products.
  <img width="1918" height="1030" alt="VM6" src="https://github.com/user-attachments/assets/d9490ec0-a7e5-42c0-819c-640b7a27f8e2" />
  
  <img width="1915" height="1027" alt="VM4" src="https://github.com/user-attachments/assets/ad18862b-9226-4ce7-a03f-145891b72601" />

- **Vendor Listing Page**: Public page with search, category filtering, and sorting by average rating.
  <img width="1918" height="1027" alt="VM1" src="https://github.com/user-attachments/assets/308a10da-7e67-4f3e-a5e5-52973358df08" />

- **Client Feedback & Rating**: Dedicated page to submit ratings and comments, automatically updating the vendor's average rating in the database.
  <img width="1911" height="1022" alt="VM7" src="https://github.com/user-attachments/assets/829d809f-cbd4-491d-ac4f-499196991a21" />

- **Admin Panel (Basic)**: Simple, unauthenticated view of all vendors, ratings, and review counts.
  <img width="1918" height="1027" alt="VM1" src="https://github.com/user-attachments/assets/97c8c512-037d-4dc5-a10c-b91f556b1ad3" />

 ## 💻 Tech Stack

**Frontend**

- React (Modular Components)

- User Interface, Routing, State Management

- Modular CSS Responsive design

**Backend**

- Node.js / Express

- REST API, Business Logic, Middleware (Authentication)
  
- Bcrypt & jsonwebtoken (JWT) and Password Hashing and API Token Authentication

**Database**

- PostgreSQL

## ⚙️ Installation and Setup

**Prerequisites**

Node.js (v16+)

PostgreSQL Server

A code editor (VS Code recommended)

## Installation

1: **Clone the Repository**

    ```
      git clone https://github.com/amaankazi81/Vendor-Management-Mini-Portal.git
      cd Vendor-Management-Mini-Portal


2: **Database Setup**

- Create Database: Create a new PostgreSQL database (e.g., quickso_vendor_portal).

- Schema Initialization: Execute the contents of the backend/sql/init.sql file in your PostgreSQL client (psql, PGAdmin, etc.) to create the vendors, products, and ratings tables, along with the necessary rating calculation trigger.

- Environment File: Create a .env file in the backend/ directory:

**.env (backend)**

     ```
        PORT=5000
        DB_USER=your_db_user
        DB_HOST=localhost
        DB_DATABASE=quickso_vendor_portal
        DB_PASSWORD=your_db_password
        DB_PORT=5432
        JWT_SECRET=a_strong_secret_key_for_jwt_signing

3: **Backend Installation**

- Navigate to the backend directory and install dependencies:
  ```
    cd backend
    npm install
    npm start

The server will run on http://localhost:5000


4: **Frontend Installation**

- Navigate to the frontend directory and install dependencies:
  ```
    cd ../frontend
    npm install
    npm start

The app will run on http://localhost:3000 (or similar)


## 🔗 Deployment & Testing Links

Live Frontend URL

## 📝 License
This project is licensed under the MIT License - see the LICENSE file for details.


