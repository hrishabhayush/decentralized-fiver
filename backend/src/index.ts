import express from "express";
import userRouter from "./routers/user";
import workerRouter from "./routers/worker";

const app = express();

// postgress + prisma => ORM 

app.use("/v1/user", userRouter);
app.use("/v1/worker", workerRouter);