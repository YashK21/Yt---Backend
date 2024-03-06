import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extend: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// routes import
import userRouter from "./routes/user.routes.js" 
// here we imported userRouter as the name for router in user.routes.js
// we have given other name then router , it's possible bcz we exported router as default (See the file)

// routes decl
app.use("/api/v1/users",userRouter) 
// as soon the /api/v1/users is hit by the client the control goes to userRouter,
// and then in userRouter the further route is hit so
// the url becomes - http://localhost:8000/api/v1/users/register - /register comes from userRouter
// we can have multiple routes like that

export { app };
