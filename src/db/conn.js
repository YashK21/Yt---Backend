import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

const connDB = async () => {
  try {
    const connectInstance = await mongoose.connect(
      `${process.env.DB}/${DB_NAME}`
    );
    console.log(
      `MongoDB connected ,  DB Host: ${connectInstance.connection.host}`
    );
  } catch (err) {
    console.error("Error! while connecting to DB", err);
    process.exit(1);
  }
};

export default connDB;
