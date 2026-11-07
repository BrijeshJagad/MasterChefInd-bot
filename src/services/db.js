const mongoose = require("mongoose");
const logger = require("./logger");

async function connectDB() {
  if (!process.env.MONGO_URI) {
    logger.error("db.config", "MONGO_URI is not defined in environment variables");
    return;
  }
  
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    logger.info("db.connected", "MongoDB connected successfully via Mongoose", {
      host: mongoose.connection.host,
      name: mongoose.connection.name
    });

    mongoose.connection.on("error", (err) => {
      logger.error("db.error", "MongoDB connection runtime error", { error: err });
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("db.disconnected", "MongoDB disconnected from database server");
    });

    return conn;
  } catch (err) {
    logger.error("db.connect_failed", "MongoDB initial connection failed", { error: err });
    throw err;
  }
}

module.exports = { connectDB };
