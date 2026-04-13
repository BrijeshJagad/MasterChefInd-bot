const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const menuSchema = new mongoose.Schema({
  weekKey: String,
  data: Object,
  pdfBuffer: Buffer,
  fileName: String,
  contentType: String,
  updatedAt: { type: Date, default: Date.now }
});

const Menu = mongoose.models.Menu || mongoose.model('Menu', menuSchema);

async function checkDB() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB");
  
  const count = await Menu.countDocuments();
  console.log("Total Menus:", count);
  
  const latest = await Menu.findOne({}).sort({ weekKey: -1 });
  console.log("Latest WeekKey in DB:", latest ? latest.weekKey : "NONE");
  
  if (latest) {
    console.log("Days in latest:", Object.keys(latest.data));
  }
  
  await mongoose.disconnect();
}

checkDB();
