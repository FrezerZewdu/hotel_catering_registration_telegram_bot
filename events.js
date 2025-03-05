import mariadb from 'mariadb';
import dotenv from 'dotenv';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { broadcastEvent } from './broadcast.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Create a connection pool
const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectionLimit: 5
});

/**
 * Create a new catering event
 * @param {Object} eventData - Event data
 * @param {Object} bot - Telegram bot instance
 * @param {Object} departments - Departments and their chat IDs
 * @param {number} chatId - Chat ID of the user who created the event
 * @returns {Object} - Created event with ID
 */
export async function createEvent(eventData, bot, departments, chatId) {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query('INSERT INTO events (client_name, company_name, company_tin, contact_number, event_name, event_date, event_time, participants, location, duration, services, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
      eventData.clientName,
      eventData.companyName,
      eventData.tinNumber || null,
      eventData.contactNumber,
      eventData.eventName,
      eventData.eventDate,
      eventData.eventTime || null,
      eventData.participants,
      eventData.location || null,
      eventData.duration || null,
      eventData.services || null,
      new Date().toISOString()
    ]);

    const createdEvent = { id: result.insertId, ...eventData, createdAt: new Date().toISOString() };

    // Generate PDF
    const pdfFilePath = await generateEventPDF(createdEvent, departments);

    // Send PDF to the user who created the event
    await bot.sendDocument(chatId, pdfFilePath);

    // Broadcast event and PDF to all departments
    await broadcastEvent(bot, departments, createdEvent, pdfFilePath);

    return createdEvent;
  } finally {
    if (conn) conn.end();
  }
}
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};
/**
 * Generate a PDF file for the event
 * @param {Object} event - Event data
 * @returns {string} - File path of the generated PDF
 */
async function generateEventPDF(event) {
  const departments =  process.env.DEPARTMENT_NAMES.split(',');
  const pdfDir = path.join(__dirname, 'pdfs'); // Ensure directory exists
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
  }

  const filePath = path.join(pdfDir, `${event.companyName}_${event.eventDate}_${event.id}.pdf`);
  const logoPath = path.join(__dirname, 'assets', 'logo.png'); // Adjust for logo
  const signatureDir = path.join(__dirname, 'assets', 'signatures'); // Adjust for signatures
  const watermarkPath = path.join(__dirname, 'assets', 'logo.png'); // Adjust for watermark
  const fontFile = path.join(__dirname, 'assets', 'NotoColorEmoji.ttf'); // Adjust for font
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream); // Pipe before writing
    const fullWidth = doc.page.width;
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 5, { width: fullWidth - 100 });
    }

    doc
      .moveTo(50, 70)
      .lineTo(fullWidth - 50, 70)
      .stroke();

      doc.moveDown(1)
      .fontSize(9)
      .text(`Event ID:  ${event.id}`, { align: 'right' })
      .moveDown(0.2);

      doc.fontSize(9)
        .text(`Date: ${formatDate(event.createdAt)}`, { align: 'right' })
        .moveDown(0.2);

    // Section Helper Function
    function addSection(title, items) {
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#0000FF')
        .text(title).moveDown(0.5)
        .font('Helvetica').fillColor('black').fontSize(10);

      if (Array.isArray(items)) {
        items.forEach(item => {
          doc.text(`• ${item}`, { indent: 20 }).moveDown(0.2);
        });
      } else {
        doc.text(items, {width: doc.page.width -100, align: 'left'});
      }
      doc.moveDown(1);
    }

    // Client Info
    addSection('Client Info', [
      `Client Name: ${event.clientName}`,
      `Company Name: ${event.companyName}`,
      `Company TIN no.:${event.tinNumber}`,
      `Contact Number: ${event.contactNumber}`,
    ]);

    // Event Details
    addSection('Event Details', [
      `Event Name: ${event.eventName}`,
      `Event Date: ${event.eventDate}`,
      `Event Time: ${event.eventTime || 'Not specified'}`,
      `Participants: ${event.participants}`,
      `Location: ${event.location || 'Not specified'}`,
      `Duration: ${event.duration || 'Not specified'}`,
    ]);

    // Services
    addSection('Services', event.services ? event.services : ['Not specified']);
    
    // Billing instruction
    addSection('Billing Instruction', [
      'Please contact Mr. Merhawi Solomon for billing Instructions.',
      'Note: First Day: As per request. Subsequent Days: Based on the available number of Participants.'
    ]);

    // **Service Approval with Signatures**
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#0000FF').text("Service Approval").moveDown(0.5).fontSize(10).fillColor('black');

    const managers = [
      { job: 'Prepared By', name: "Merhawi Solomon (Marketing Manager)", signature: "merhawi.png" },
      { job: 'Approved By', name: "Kirubel Yirdaw (Operational Manager)", signature: "kirubel.png" },
      { job: 'Approved By', name: "Mulu Hadush (General Manager)", signature: "mulu.png" },
    ];

    managers.forEach((manager) => {
      doc.fontSize(10).text(`${manager.job}: ${manager.name}`);
      const signaturePath = path.join(signatureDir, manager.signature);
      const signatureX = (doc.page.width - 100) /3;
      if (fs.existsSync(signaturePath)) {
        doc.image(
          signaturePath, 
          (signatureX + 140), 
          (doc.y - (manager.signature == 'kirubel.png'? 28 : 26)), 
          { align: 'center', width: 67 }
        );
      }
      doc.moveDown(1);
    });
    // CC’d Departments (Grid Layout - 3 Columns)
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#0000FF')
      .text('CC - Department').moveDown(0.5)
      .font('Helvetica').fillColor('black').fontSize(10);

      const columns = 3;
      const colWidth = (doc.page.width - 100) / columns; // calculate width of each column
      let colIndex = 0;
      let yPosition = doc.y + 5; // Starting Y position
  
      departments.forEach((department, index) => {
        if (index > 0 && index % (departments.length / columns) === 0) {
          colIndex++;
          yPosition = doc.y - (15*parseInt(departments.length / columns)); // Reset Y position for next column
        }
  
        doc.text(department, 50 + colIndex * colWidth, yPosition);
        yPosition += 15;
      });
  
      // Footer Section in 3-column format
      doc.moveDown(1);
      doc
      .moveTo(50, 70)
      .strokeColor('#000').lineWidth(1)
      .lineTo(fullWidth - 50, 70)
      .stroke();

      doc.moveDown(1);
      const footerY = doc.y;
      const footerWidth = doc.page.width - 100;
  
      // Split footer into 3 columns
      doc.x = 50; // Start at left margin
      const column = (footerWidth / 3) - 20; // Calculate width of each column
      // Column 1
      doc.font('Helvetica').fontSize(8).fillColor('gray')
        .text('Phone: +251-93-028-5483', { align: 'left', width: column })
        .moveDown(0.5)
        .text('Website: www.planethotelethiopia.com', { align: 'left', width: column });
      doc.y = footerY; // Reset Y position for next column
      doc.x += column + 20;
      // Column 2
      doc.fontSize(8).fillColor('gray')
        .text('Email: contact@planethotelethiopia.com', { align: 'center', width: column })
        .moveDown(0.5)
        .text('Address: Tigray, Ethiopia', { align: 'center', width: column });
      
        doc.y = footerY; // Reset Y position for next column
        doc.x += column + 20;
      // Column 3
      doc.fontSize(8).fillColor('gray')
        .text('Fax: 0344405717', { align: 'right', width: column })
        .moveDown(0.5)
        .text('Location: Hawelty street, Mekele', { align: 'right', width: column });
  

    doc.end(); // End document after writing everything

    stream.on('finish', () => resolve(filePath));
    stream.on('error', (err) => reject(err));
  });
}

/**
 * Validate event data
 * @param {Object} eventData - Event data to validate
 * @returns {Object} - Validation result
 */
export function validateEvent(eventData) {
  // Check required fields
  if (!eventData.clientName) {
    return { valid: false, error: "Client name is required" }
  }

  if (!eventData.companyName) {
    return { valid: false, error: "Company name is required" }
  }

  if (!eventData.contactNumber) {
    return { valid: false, error: "Contact number is required" }
  }

  if (!eventData.eventName) {
    return { valid: false, error: "Event name is required" }
  }

  if (!eventData.eventDate) {
    return { valid: false, error: "Event date is required" }
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(eventData.eventDate)) {
    return { valid: false, error: "Date must be in YYYY-MM-DD format" }
  }

  if (!eventData.participants || isNaN(eventData.participants)) {
    return { valid: false, error: "Number of participants is required and must be a number" }
  }

  return { valid: true }
}

/**
 * Get all events
 * @returns {Promise<Array>} - All events
 */
export async function getAllEvents() {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query('SELECT * FROM events');
    return rows;
  } finally {
    if (conn) conn.end();
  }
}

/**
 * Get event by ID
 * @param {string} id - Event ID
 * @returns {Promise<Object|null>} - Event or null if not found
 */
export async function getEventById(id) {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query('SELECT * FROM events WHERE id = ?', [id]);
    return rows.length > 0 ? rows[0] : null;
  } finally {
    if (conn) conn.end();
  }
}

