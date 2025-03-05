import TelegramBot from "node-telegram-bot-api"
import { addToMarketingTeam, removeFromMarketingTeam, authorizeUser, isMarketingTeam, getMarketingTeam } from "./auth.js"
import { createEvent, validateEvent, getAllEvents } from "./events.js"
import { broadcastEvent } from "./broadcast.js"
import { registerUser, isAdmin } from "./register.js"
import dotenv from "dotenv"
import { getDepartments } from "./departments.js"
dotenv.config();

// Replace with your bot token
const token = process.env.TELEGRAM_BOT_TOKEN

// Create a bot instance
const bot = new TelegramBot(token, { polling: true })

// Initialize departments from the database with predefined names
let departments = {}
const departmentNames = process.env.DEPARTMENT_NAMES.split(',')

async function initializeDepartments() {
  const dbDepartments = await getDepartments()
  departmentNames.forEach(name => {
    departments[name.trim()] = dbDepartments[name.trim()] || []
  })
}

initializeDepartments();
bot.setMyCommands([
  { command: "/start", description: "Start the bot and see options" },
  { command: "/help", description: "Show available commands" },
  { command: "/add_marketing", description: "Add a user to the marketing team" },
  { command: "/remove_marketing", description: "Remove a user from the marketing team" },
  { command: "/list_marketing", description: "List all marketing team members" },
  { command: "/list", description: "List users in a department (Admin only)" },
  { command: "/create", description: "Create a new catering event (Marketing only)" },
  { command: "/list_events", description: "List all upcoming catering events" }
])
.then(() => console.log("✅ Bot commands set successfully"))
.catch((error) => console.error("❌ Error setting bot commands:", error));

// Welcome message and prompt to register into a department
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id
  const username = msg.from.username

  // Check if the user is already registered in any department
  const userDepartments = Object.keys(departments).filter(department => departments[department].includes(chatId))
  if (userDepartments.length > 0) {
    return bot.sendMessage(
      chatId,
      "Welcome back to Planet Hotel Event Bot!\n\n" +
        "You are already registered in the following departments: " + userDepartments.join(", ") + "\n\n" +
        "Commands:\n" +
        "/create - Create a new event (Marketing team only)\n" +
        "/list_events - List all upcoming events\n" +
        "/add_marketing - Add a user to the marketing team\n" +
        "/remove_marketing - Remove a user from the marketing team\n" +
        "/help - Show this help message",
    )
  }

  try {
    // Set user state to "registering"
    await authorizeUser(msg.from.id, "registering")

    // Prompt the user to register into a department
    bot.sendMessage(
      chatId,
      "Welcome to the Hotel Catering Event Bot!\n\n" +
        "Please register into a department by replying with the department name.\n\n" +
        `Available departments: ${departmentNames.join(', ')}`,
    )
  } catch (error) {
    console.error("Error during user registration:", error)
    bot.sendMessage(chatId, "An error occurred while trying to register you. Please try again later.")
  }
})

// Listen for messages to handle user registration and event creation
bot.on("message", async (msg) => {
  const chatId = msg.chat.id
  const userId = msg.from.id
  const text = msg.text

  // Skip commands
  if (text.startsWith("/")) return

  // Check user state
  const userState = await authorizeUser(userId)
  if (userState === "registering") {
    const department = text.trim()

    if (!departmentNames.includes(department)) {
      return bot.sendMessage(
        chatId,
        "Invalid department. Please start again and choose a valid department.\n\n" +
          `Available departments: ${departmentNames.join(', ')}`,
      )
    }

    // Add chat ID to department if not already registered
    if (!departments[department].includes(chatId)) {
      await registerUser(chatId, department)
      departments[department].push(chatId)
      bot.sendMessage(chatId, `You are now registered to the ${department} department.`)
    } else {
      bot.sendMessage(chatId, `You are already registered to the ${department} department.`)
    }

    // Reset user state
    await authorizeUser(userId, null)
  } else if (userState && userState.startsWith("creating_event")) {
    let event = {};
    try {
      const index = userState.indexOf(":"); // Find the first occurrence of ':'
      const userStateEvent = index !== -1 ? userState.slice(index + 1) : "{}";
      event = JSON.parse(userStateEvent);
    } catch (error) {
      console.error("Error parsing event state:", error)
    }

    if (!event.clientName) {
      event.clientName = text
      await authorizeUser(userId, `creating_event:${JSON.stringify(event)}`)
      return bot.sendMessage(chatId, "Please enter the Company Name:")
    }

    if (!event.companyName) {
      event.companyName = text
      await authorizeUser(userId, `creating_event:${JSON.stringify(event)}`)
      return bot.sendMessage(chatId, "Please enter the Contact Number:")
    }

    if(!event.tinNumber) {
      event.tinNumber = text
      await authorizeUser(userId, `creating_event:${JSON.stringify(event)}`)
      return bot.sendMessage(chatId, "Please enter the TIN Number:")
    }

    if (!event.contactNumber) {
      event.contactNumber = text
      await authorizeUser(userId, `creating_event:${JSON.stringify(event)}`)
      return bot.sendMessage(chatId, "Please enter the Event Name:")
    }

    if (!event.eventName) {
      event.eventName = text
      await authorizeUser(userId, `creating_event:${JSON.stringify(event)}`)
      return bot.sendMessage(chatId, "Please enter the Event Date (YYYY-MM-DD):")
    }

    if (!event.eventDate) {
      event.eventDate = text
      await authorizeUser(userId, `creating_event:${JSON.stringify(event)}`)
      return bot.sendMessage(chatId, "Please enter the Event Time (HH:MM):")
    }

    if (!event.eventTime) {
      event.eventTime = text
      await authorizeUser(userId, `creating_event:${JSON.stringify(event)}`)
      return bot.sendMessage(chatId, "Please enter the Number of Participants:")
    }

    if (!event.participants) {
      event.participants = text
      await authorizeUser(userId, `creating_event:${JSON.stringify(event)}`)
      return bot.sendMessage(chatId, "Please enter the Event Location:")
    }

    if (!event.location) {
      event.location = text
      await authorizeUser(userId, `creating_event:${JSON.stringify(event)}`)
      return bot.sendMessage(chatId, "Please enter the Event Duration (Half Day or Full Day):")
    }

    if (!event.duration) {
      event.duration = text
      await authorizeUser(userId, `creating_event:${JSON.stringify(event)}`)
      return bot.sendMessage(chatId, "Please enter the services (use comma for list of services):")
    }

    if (!event.services) {
      event.services = text
      await authorizeUser(userId, null) // Reset user state

      // Create the event
      const createdEvent = await createEvent(event, bot, departments, chatId)

      // Confirm to marketing team
      return bot.sendMessage(
        chatId,
        "Catering event created and broadcasted to all departments!",
      )
    }
  }
})

// Help command
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id
  bot.sendMessage(
    chatId,
    "Hotel Catering Event Bot Commands:\n\n" +
      "/register [department] - Register to a department (Admin only)\n" +
      "/add_marketing [username] - Add a user to the marketing team\n" +
      "/remove_marketing [username] - Remove a user from the marketing team\n" +
      `Available departments: ${departmentNames.join(', ')}\n\n` +
      "/create - Create a new catering event (Marketing team only)\n" +
      "/help - Show this help message",
  )
});

bot.onText(/\/add_marketing (@\w+)/, async (msg, match) => {
  try {
     const chatId = msg.chat.id;
    const username = match[1].substring(1); // Remove '@' from username

    await addToMarketingTeam(username);
    bot.sendMessage(chatId, `✅ User @${username} has been added to the marketing team.`);
  } catch (error) {
    console.error("Error adding user to marketing team:", error);
  }
 
});

// Command to remove a user from the marketing team
bot.onText(/\/remove_marketing (@\w+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const username = match[1].substring(1); // Remove '@' from username

  await removeFromMarketingTeam(username);
  bot.sendMessage(chatId, `❌ User @${username} has been removed from the marketing team.`);
});

// Command to list marketing team members
bot.onText(/\/list_marketing/, async (msg) => {
  const chatId = msg.chat.id;
  const members = await getMarketingTeam();
  
  if (members.length === 0) {
    return bot.sendMessage(chatId, "⚠️ No marketing team members found.");
  }

  bot.sendMessage(chatId, `📋 Marketing Team Members:\n${members.map(username => `@${username}`).join("\n")}`);
});

// List users within a department (Admin only)
bot.onText(/\/list (.+)/, async (msg, match) => {
  const chatId = msg.chat.id
  const department = match[1].toLowerCase()
  const userId = msg.from.id

  // Check if user is admin
  if (!(await isAdmin(userId))) {
    return bot.sendMessage(chatId, "Sorry, only the admin can list users in departments.")
  }

  if (!departments[department]) {
    return bot.sendMessage(
      chatId,
      "Invalid department. Available departments are: " + Object.keys(departments).join(", "),
    )
  }

  const users = departments[department]
  if (users.length === 0) {
    return bot.sendMessage(chatId, `No users found in the ${department} department.`)
  }

  bot.sendMessage(chatId, `Users in ${department} department:\n${users.join("\n")}`)
})

// Register a username to a department (Admin only)
bot.onText(/\/register (\w+) (@\w+)/, async (msg, match) => {
  const chatId = msg.chat.id
  const department = match[1].toLowerCase().trim()
  const username = match[2].substring(1) // Remove '@' from username
  const userId = msg.from.id

  // Check if user is admin
  if (!(await isAdmin(userId))) {
    return bot.sendMessage(chatId, "Sorry, only the admin can register users to departments.")
  }

  if (!departmentNames.includes(department)) {
    return bot.sendMessage(
      chatId,
      "Invalid department. Available departments are: " + departmentNames.join(", "),
    )
  }

  // Get the chat ID of the user to be registered
  const userChatId = await getUserChatId(username)
  if (!userChatId) {
    return bot.sendMessage(chatId, `User @${username} not found. Ask them to use /capture_chat_id command.`)
  }

  // Add chat ID to department if not already registered
  if (!departments[department].includes(userChatId)) {
    await registerUser(userChatId, department)
    departments[department].push(userChatId)
    bot.sendMessage(chatId, `User @${username} is now registered to the ${department} department.`)
  } else {
    bot.sendMessage(chatId, `User @${username} is already registered to the ${department} department.`)
  }
})

// Capture chat ID when a user interacts with the bot
bot.onText(/\/capture_chat_id/, async (msg) => {
  const chatId = msg.chat.id
  const username = msg.from.username

  // Store the chat ID and username in the database
  await storeUserChatId(username, chatId)
  bot.sendMessage(chatId, `Chat ID for @${username} has been captured.`)
})

// Function to store the chat ID and username in the database
async function storeUserChatId(username, chatId) {
  // Implement this function to store the chat ID and username in your database
  // For now, we'll just log the values
  console.log(`Storing chat ID for @${username}: ${chatId}`)
}

// Function to get the chat ID of a user by username
async function getUserChatId(username) {
  // Implement this function to retrieve the chat ID of a user by their username from your database
  // For now, we'll return a placeholder value
  return null
}

// Create a new catering event (Marketing team only)
bot.onText(/\/create/, async (msg) => {
  const chatId = msg.chat.id
  const username = msg.from.username

  // Check if username is defined
  if (!chatId) {
    return bot.sendMessage(chatId, "Error: Your Telegram username is not set. Please set a username in your Telegram settings and try again.")
  }

  // Check if user is authorized (marketing team)
  if (!(await isMarketingTeam(chatId))) {
    return bot.sendMessage(chatId, "Sorry, only marketing team members can create catering events.")
  }

  // Start event creation process
  await authorizeUser(msg.from.id, "creating_event: {}")
  bot.sendMessage(chatId, "Welcome to Planet Hotel Catering Order Maker System! Please enter the Client Name:")
})

// List upcoming events
bot.onText(/\/list_events/, async (msg) => {
  const chatId = msg.chat.id
  const events = await getAllEvents()

  if (events.length === 0) {
    return bot.sendMessage(chatId, "No upcoming events found.")
  }

  const eventMessages = events.map(event => {
    return `*Event:* ${event.name}\n*Date:* ${event.date}\n*Time:* ${event.time || "Not specified"}\n*People:* ${event.people}\n*Location:* ${event.location || "Not specified"}\n${event.details ? `*Details:* ${event.details}` : ""}`
  }).join("\n\n")

  bot.sendMessage(chatId, `📅 Upcoming Events:\n\n${eventMessages}`, { parse_mode: "Markdown" })
})

// Parse event details from text
function parseEventDetails(text) {
  const event = {}

  // Extract fields using regex
  const nameMatch = text.match(/Name:\s*(.+)(\n|$)/i)
  const peopleMatch = text.match(/People:\s*(\d+)(\n|$)/i)
  const dateMatch = text.match(/Date:\s*(.+)(\n|$)/i)
  const timeMatch = text.match(/Time:\s*(.+)(\n|$)/i)
  const locationMatch = text.match(/Location:\s*(.+)(\n|$)/i)
  const detailsMatch = text.match(/Details:\s*(.+)(\n|$)/i)

  if (nameMatch) event.name = nameMatch[1].trim()
  if (peopleMatch) event.people = Number.parseInt(peopleMatch[1].trim())
  if (dateMatch) event.date = dateMatch[1].trim()
  if (timeMatch) event.time = timeMatch[1].trim()
  if (locationMatch) event.location = locationMatch[1].trim()
  if (detailsMatch) event.details = detailsMatch[1].trim()

  return event
}

// Error handling
bot.on("polling_error", (error) => {
  console.error("Polling error:", error)
})

console.log("Hotel Catering Event Bot is running...")

