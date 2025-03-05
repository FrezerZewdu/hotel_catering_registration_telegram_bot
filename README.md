# Planet Hotel Catering Ordering Bot

## Overview
The Planet Hotel Catering Ordering Bot is a Telegram bot designed to streamline the process of creating and managing catering events for Planet Hotel. The bot allows users to register into departments, create events, and broadcast event details to relevant departments.

## Features
- User registration into departments
- Event creation by marketing team members
- Broadcasting event details to all departments
- Generating and sending event details as PDF
- Admin commands for managing marketing team members

## Prerequisites
- Node.js (v14 or higher)
- MariaDB
- Telegram account and bot token

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/planet_hotel_bot.git
   cd planet_hotel_bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add the following environment variables:
   ```properties
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_db_password
   DB_DATABASE=planet_hotel_bot
   DEPARTMENT_NAMES=F&B Manager,General Manager,Operational Manager,B&R Manager,Barman,Kitchen,Pastry,ICT,F&B Control,Housekeeping,Maintenance,Security
   ```

4. Set up the database:
   ```bash
   npm run setup-db
   ```

## Usage

1. Start the bot:
   ```bash
   npm start
   ```

2. Interact with the bot on Telegram using the following commands:
   - `/start` - Start the bot and see options
   - `/help` - Show available commands
   - `/add_marketing @username` - Add a user to the marketing team
   - `/remove_marketing @username` - Remove a user from the marketing team
   - `/list_marketing` - List all marketing team members
   - `/list department` - List users in a department (Admin only)
   - `/create` - Create a new catering event (Marketing only)
   - `/list_events` - List all upcoming catering events

## Project Structure

```
planet_hotel_bot/
├── assets/                 # Assets like logos and signatures
├── pdfs/                   # Generated PDF files
├── .env                    # Environment variables
├── .gitignore              # Git ignore file
├── auth.js                 # Authentication and authorization logic
├── broadcast.js            # Event broadcasting logic
├── departments.js          # Department management logic
├── events.js               # Event creation and management logic
├── index.js                # Main bot logic
├── package.json            # Project metadata and dependencies
├── register.js             # User registration logic
├── schema.sql              # Database schema
└── README.md               # Project documentation
```

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License
This project is licensed under the ISC License.

## Author
Frezer Zewdu
