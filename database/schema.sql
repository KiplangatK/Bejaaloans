-- =============================================
-- BEJJA LOAN CREDIT - Complete MySQL Setup
-- =============================================

-- Create database
CREATE DATABASE IF NOT EXISTS bejja_loan_db;
USE bejja_loan_db;

-- =============================================
-- CLIENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fullname VARCHAR(100) NOT NULL,
    national_id VARCHAR(20) NOT NULL,
    phone VARCHAR(15) NOT NULL UNIQUE,
    email VARCHAR(100) DEFAULT NULL,
    occupation VARCHAR(100) DEFAULT NULL,
    employer VARCHAR(100) DEFAULT NULL,
    monthly_income DECIMAL(12,2) DEFAULT 0.00,
    county VARCHAR(50) DEFAULT NULL,
    address TEXT DEFAULT NULL,
    profile_photo LONGTEXT DEFAULT NULL,
    id_front LONGTEXT DEFAULT NULL,
    id_back LONGTEXT DEFAULT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status ENUM('ACTIVE', 'SUSPENDED') DEFAULT 'ACTIVE',
    created_at DATE NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================
-- STAFF / ADMIN TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS staff (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'Staff',
    active BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert admin account
INSERT INTO staff (username, password_hash, role, active) 
VALUES ('Kiplangat', '$2a$10$ZGMbpIAfx8RZh78SQ/TKcubAswPSoHv0WOqTE6c.xgBeAAk9WTqS2', 'Administrator', TRUE);

-- =============================================
-- LOAN APPLICATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS loan_applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    purpose VARCHAR(200) DEFAULT NULL,
    monthly_interest DECIMAL(12,2) DEFAULT 0.00,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    application_date DATE NOT NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================
-- GUARANTORS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS guarantors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    name VARCHAR(100) DEFAULT NULL,
    national_id VARCHAR(20) DEFAULT NULL,
    phone VARCHAR(15) DEFAULT NULL,
    relationship VARCHAR(50) DEFAULT NULL,
    address TEXT DEFAULT NULL,
    photo LONGTEXT DEFAULT NULL,
    id_front LONGTEXT DEFAULT NULL,
    id_back LONGTEXT DEFAULT NULL,
    guarantor_number ENUM('1', '2') NOT NULL,
    FOREIGN KEY (application_id) REFERENCES loan_applications(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================
-- LOANS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS loans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    application_id INT DEFAULT NULL,
    original_principal DECIMAL(12,2) NOT NULL,
    remaining_principal DECIMAL(12,2) NOT NULL,
    purpose VARCHAR(200) DEFAULT NULL,
    interest_rate DECIMAL(5,2) DEFAULT 20.00,
    current_interest DECIMAL(12,2) DEFAULT 0.00,
    loan_date DATE NOT NULL,
    due_date DATE NOT NULL,
    approved_by VARCHAR(100) DEFAULT NULL,
    status ENUM('ACTIVE', 'COMPLETED') DEFAULT 'ACTIVE',
    created_at DATE NOT NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES loan_applications(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================
-- PAYMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    principal_paid DECIMAL(12,2) DEFAULT 0.00,
    interest_paid DECIMAL(12,2) DEFAULT 0.00,
    balance DECIMAL(12,2) DEFAULT 0.00,
    payment_date DATE NOT NULL,
    method ENUM('Cash', 'M-Pesa', 'Bank') DEFAULT 'Cash',
    note VARCHAR(255) DEFAULT NULL,
    FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
