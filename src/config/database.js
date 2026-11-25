import mongoose from "mongoose";
import config from "./config.js";

async function connectDB() {
  mongoose.connection.on("error", (error) =>
    console.error("MongoDB connection error:", error.message),
  );
  mongoose.connection.on("disconnected", () =>
    console.warn("MongoDB disconnected."),
  );

  try {
    const status = await mongoose.connect(config.mongoDBUrl, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log(
      `MongoDB connected: ${status.connection.host}/${status.connection.name}`,
    );
  } catch (error) {
    throw new Error(
      `Could not connect to MongoDB at the MONGODB_URL in .env (${error.message}). ` +
        "Start a local MongoDB or use a MongoDB Atlas connection string.",
    );
  }
}

export default connectDB;
