const PDFDocument = require('pdfkit');

/**
 * Synthesizes a clean PDF menu based strictly on the JSON data provided.
 * Provides a highly professional two-column layout showing the whole week.
 * 
 * @param {Object} menuData - The JSON object containing the menu (keyed by uppercase day)
 * @param {String} weekKey - The YYYYWW formatted week string
 * @returns {Promise<Buffer>} - Resolves with the binary PDF buffer
 */
function generateMenuPDF(menuData, weekKey) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const Buffer = require('buffer').Buffer;
        resolve(Buffer.concat(buffers));
      });

      // -- Brand Header --
      doc.rect(0, 0, doc.page.width, 100).fill('#0f172a'); // Deep slate header bg
      doc.fillColor('#ffffff')
         .fontSize(24)
         .font('Helvetica-Bold')
         .text('MASTERCHEF LOGISTICS', 50, 40, { align: 'center' });
      
      const year = weekKey ? weekKey.substring(0, 4) : new Date().getFullYear();
      const week = weekKey ? weekKey.substring(4) : '';
      doc.fontSize(12)
         .font('Helvetica')
         .text(`WEEKLY CANTEEN MENU - ${year} COURSE ${week}`, 50, 70, { align: 'center' });
      
      // Decorative line
      doc.moveTo(50, 115).lineTo(545, 115).lineWidth(1.5).stroke('#e2e8f0');

      let yPos = 140;
      doc.fillColor('#1e293b'); // Dark text color

      const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
      
      DAYS.forEach((dayKey, index) => {
        const dayRecord = menuData[dayKey];
        if (!dayRecord) return; // Skip days with no info

        // Page break logic if getting too low
        if (yPos > doc.page.height - 150) {
          doc.addPage();
          yPos = 50;
        }

        // Day Title
        const dateStr = dayRecord.date ? ` (${dayRecord.date})` : '';
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#3b82f6')
           .text(`${dayKey}${dateStr}`, 50, yPos);
        
        yPos += 20;

        // Meal Columns Config
        const cols = [
          { label: "BREAKFAST", text: dayRecord.breakfast || "—", x: 50 },
          { label: "LUNCH", text: dayRecord.lunch || "—", x: 220 },
          { label: "DINNER", text: dayRecord.dinner || "—", x: 390 }
        ];

        let maxY = yPos;

        cols.forEach(col => {
          doc.fontSize(10).font('Helvetica-Bold').fillColor('#64748b').text(col.label, col.x, yPos);
          doc.fontSize(11).font('Helvetica').fillColor('#0f172a').text(col.text, col.x, yPos + 15, { width: 155, align: 'left' });
          
          // Calculate max Y height across columns to standardize next row push
          const currentY = doc.y;
          if (currentY > maxY) maxY = currentY;
        });

        yPos = maxY + 30; // Spacing for the next day block
      });

      // Footer
      doc.moveTo(50, doc.page.height - 50).lineTo(545, doc.page.height - 50).lineWidth(1).stroke('#f1f5f9');
      doc.fillColor('#94a3b8').fontSize(9).font('Helvetica-Oblique')
         .text('Dynamically compiled securely via MasterChefInd-bot ecosystem.', 50, doc.page.height - 40, { align: 'center' });

      doc.end();

    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateMenuPDF };
