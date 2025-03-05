CREATE TABLE IF NOT EXISTS user_states (
  user_id BIGINT PRIMARY KEY,
  state VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS marketing_team (
  username VARCHAR(255) PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  client_name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  company_tin VARCHAR(255),
  contact_number VARCHAR(255) NOT NULL,
  event_name VARCHAR(255) NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME,
  participants INT NOT NULL,
  location VARCHAR(255),
  duration VARCHAR(255),
  services TEXT,
  created_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS departments (
  chat_id BIGINT PRIMARY KEY,
  department VARCHAR(255) NOT NULL
);
