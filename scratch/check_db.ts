import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Menu } from '../src/services/models';

dotenv.config();

async function checkDB(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is not set in environment.');
    return;
  }
  await mongoose.connect(uri);
  console.log('Connected to DB');

  const count = await Menu.countDocuments();
  console.log('Total Menus:', count);

  const latest = await Menu.findOne({}).sort({ weekKey: -1 }).lean();
  console.log('Latest WeekKey in DB:', latest ? latest.weekKey : 'NONE');

  if (latest && latest.data) {
    console.log('Days in latest:', Object.keys(latest.data));
  }

  await mongoose.disconnect();
}

checkDB();
