-- GigMatch API schema (XAMPP / MariaDB on 127.0.0.1:3306)
-- Applied by `pnpm db:setup` (server/db/setup.js). Safe to run repeatedly.

CREATE DATABASE IF NOT EXISTS gigmatch
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE gigmatch;

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(80)  NOT NULL,
  email         VARCHAR(190) NOT NULL,
  phone         VARCHAR(40)  NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'musician',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS bands (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  owner_id   INT           NULL,
  name       VARCHAR(120)  NOT NULL,
  genre      VARCHAR(190)  NOT NULL DEFAULT '',
  location   VARCHAR(120)  NOT NULL DEFAULT '',
  bio        TEXT          NULL,
  photo_url  TEXT          NULL,
  created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_bands_owner (owner_id),
  CONSTRAINT fk_bands_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS gigs (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  organizer_id INT           NULL,
  title        VARCHAR(160)  NOT NULL,
  description  TEXT          NULL,
  location     VARCHAR(160)  NOT NULL DEFAULT '',
  date         VARCHAR(60)   NOT NULL DEFAULT '',
  pay          VARCHAR(60)   NOT NULL DEFAULT '',
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_gigs_organizer (organizer_id),
  CONSTRAINT fk_gigs_organizer FOREIGN KEY (organizer_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS messages (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  sender_id   INT      NOT NULL,
  receiver_id INT      NOT NULL,
  content     TEXT     NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_messages_sender (sender_id),
  KEY idx_messages_receiver (receiver_id),
  CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_receiver FOREIGN KEY (receiver_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB;
