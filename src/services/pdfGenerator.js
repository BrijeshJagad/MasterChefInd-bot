const PDFDocument = require('pdfkit');

/**
 * Synthesizes a clean PDF menu based strictly on the JSON data provided.
 * Provides a highly professional presentation matching the web dashboard's Glassmorphism Dark Mode.
 * 
 * @param {Object} menuData - The JSON object containing the menu
 * @param {String} weekKey - The YYYYWW formatted week string
 * @returns {Promise<Buffer>} - Resolves with the binary PDF buffer
 */
function generateMenuPDF(menuData, weekKey) {
  return new Promise((resolve, reject) => {
    try {
      // Define Brand Colors matching the Dashboard
      const COLORS = {
        bg: '#0B0E14',         // Deep slate background
        cardBg: '#151A24',     // Glass panel equivalent
        cardBorder: '#1E293B', // Glass border
        textPrimary: '#FFFFFF',
        textSecondary: '#94A3B8',
        accentPrimary: '#3B82F6', // Blue
        breakfastText: '#FACC15', // Yellow
        breakfastBg: '#2A291A',   // Faint yellow bg
        lunchText: '#10B981',     // Green
        lunchBg: '#112A22',       // Faint green bg
        dinnerText: '#6366F1',    // Indigo
        dinnerBg: '#1A1B36',      // Faint indigo bg
      };

      const doc = new PDFDocument({ 
        margin: 40, 
        size: 'A4',
        info: {
          Title: `Canteen Menu - Week ${weekKey}`,
          Author: 'MasterChef Logistics'
        }
      });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const Buffer = require('buffer').Buffer;
        resolve(Buffer.concat(buffers));
      });

      // --- Background ---
      // We must draw the background on every new page. 
      // We'll hook into the generic page added event.
      doc.on('pageAdded', () => {
        doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.bg);
        // Page border decoration
        doc.rect(10, 10, doc.page.width - 20, doc.page.height - 20)
           .lineWidth(1).stroke('rgba(255,255,255,0.05)');
      });

      // Manually draw the first page background (event doesn't fire for the first page creation)
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.bg);
      doc.rect(10, 10, doc.page.width - 20, doc.page.height - 20)
         .lineWidth(1).stroke('rgba(255,255,255,0.05)');

      // --- Brand Header ---
      doc.fillColor(COLORS.textPrimary)
         .fontSize(24)
         .font('Helvetica-Bold')
         .text('MASTERCHEF LOGISTICS', 40, 40, { align: 'center' });
      
      const year = weekKey ? weekKey.substring(0, 4) : new Date().getFullYear();
      const week = weekKey ? weekKey.substring(4) : '';
      doc.fontSize(11)
         .font('Helvetica')
         .fillColor(COLORS.textSecondary)
         .text(`ULTIMATE CANTEEN MENU - YEAR ${year} | WEEK ${week}`, 40, 70, { align: 'center', characterSpacing: 2 });
      
      // Decorative header line
      doc.moveTo(200, 95).lineTo(395, 95).lineWidth(2).stroke(COLORS.accentPrimary);

      let yPos = 130;

      const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
      
      DAYS.forEach((dayKey) => {
        const dayRecord = menuData[dayKey];
        if (!dayRecord || (!dayRecord.breakfast && !dayRecord.lunch && !dayRecord.dinner)) return;

        // Calculate maximum height needed for this whole row
        // Approximately 30px per line of text. We'll pre-calculate.
        const estHeight = 130; 

        // Page break logic if getting too low
        if (yPos + estHeight > doc.page.height - 50) {
          doc.addPage();
          yPos = 50;
        }

        // Draw Card Background (Glassmorphism representation)
        const cardWidth = doc.page.width - 80;
        doc.roundedRect(40, yPos, cardWidth, estHeight, 10)
           .fillAndStroke(COLORS.cardBg, COLORS.cardBorder);

        // Day Title Group
        const dateStr = dayRecord.date ? ` (${dayRecord.date})` : '';
        doc.fontSize(14).font('Helvetica-Bold').fillColor(COLORS.textPrimary)
           .text(`${dayKey}`, 60, yPos + 15);
        doc.fontSize(10).font('Helvetica').fillColor(COLORS.textSecondary)
           .text(`${dateStr}`, 60 + doc.widthOfString(dayKey) + 5, yPos + 18);
        
        // Meal Columns Config
        const colY = yPos + 45;
        const colWidth = (cardWidth - 60) / 3; // 3 columns, minus padding
        
        const cols = [
          { 
            label: "BREAKFAST", text: dayRecord.breakfast || "—", 
            x: 60, color: COLORS.breakfastText, bg: COLORS.breakfastBg 
          },
          { 
            label: "LUNCH", text: dayRecord.lunch || "—", 
            x: 60 + colWidth + 10, color: COLORS.lunchText, bg: COLORS.lunchBg 
          },
          { 
            label: "DINNER", text: dayRecord.dinner || "—", 
            x: 60 + (colWidth + 10) * 2, color: COLORS.dinnerText, bg: COLORS.dinnerBg 
          }
        ];

        cols.forEach(col => {
          // Colored Left-Border Indicator (mimicking the web app's style)
          doc.rect(col.x, colY, 3, 60).fill(col.color);
          
          // Faint Background Box
          doc.rect(col.x + 3, colY, colWidth - 3, 60).fill(col.bg);

          // Meal Label
          doc.fontSize(8).font('Helvetica-Bold').fillColor(col.color)
             .text(col.label, col.x + 10, colY + 8);
          
          // Meal Content
          doc.fontSize(10).font('Helvetica').fillColor(COLORS.textPrimary)
             .text(col.text, col.x + 10, colY + 22, { 
                width: colWidth - 20, 
                align: 'left',
                lineGap: 2,
                height: 30, // constrain bounds
                ellipsis: true // avoid spilling
             });
        });

        yPos += estHeight + 20; // Move down for the next day block
      });

      // Footer
      doc.fontSize(9).font('Helvetica')
         .fillColor('rgba(255,255,255,0.2)')
         .text('Generated dynamically by MasterChefInd Platform', 40, doc.page.height - 30, { align: 'center' });

      doc.end();

    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateMenuPDF };
