/**
 * Broadcast an event to all departments
 * @param {Object} bot - Telegram bot instance
 * @param {Object} departments - Departments and their chat IDs
 * @param {Object} event - Event to broadcast
 * @param {string} pdfFilePath - File path of the event PDF
 */
export async function broadcastEvent(bot, departments, event, pdfFilePath) {
  // Create formatted message
  const message = formatEventMessage(event);

  // Send to all departments
  for (const [department, chatIds] of Object.entries(departments)) {
    for (const chatId of chatIds) {
      try {
        await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
        await bot.sendDocument(chatId, pdfFilePath, { caption: `Event ${event.id} Details` });
      } catch (error) {
        console.error(`Error sending message to ${department} (${chatId}):`, error);
      }
    }
  }
}

/**
 * Format event message for broadcasting
 * @param {Object} event - Event to format
 * @returns {string} - Formatted message
 */
function formatEventMessage(createdEvent) {
  const escapeMarkdown = (text) => {
    return text.replace(/([_*[\]()~`>#+-=|{}.!])/g, '\\$1');
  };

  return `
*NEW CATERING EVENT*
*Event*: ${escapeMarkdown(createdEvent.eventName)}
*Client*: ${escapeMarkdown(createdEvent.clientName)}
*Company*: ${escapeMarkdown(createdEvent.companyName)}
*Contact*: ${createdEvent.contactNumber.toString()}
*Date*: ${new Date(createdEvent.eventDate).toISOString().split('T')[0]}
*Time*: ${createdEvent.eventTime || "Not specified"}
*Participants*: ${createdEvent.participants.toString()}
*Location*: ${escapeMarkdown(createdEvent.location || "Not specified")}
*Duration*: ${escapeMarkdown(createdEvent.duration)}
*Services*: ${createdEvent.services}

Please prepare accordingly.
`;
}

