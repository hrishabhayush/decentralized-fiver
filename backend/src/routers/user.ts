import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import jwt from "jsonwebtoken"

const JWT_SECRET = "hrishabh123"

const router = Router();

const prismaClient = new PrismaClient();

// sign in with wallet (most decentralized applications follow this where you 
// connect with Phantom wallet)
// signing a message
router.post("/signin", async(req, res) => {
    // TODO: Add sign verification logic here
    const hardcodedWalletAddress = "Testing wallet address here";

    // If the user with this wallet address already exists, then it will just return userId
    // Otherwise creates the userId for that user
    const existingUser = await prismaClient.user.findFirst({
        where: {
            address: hardcodedWalletAddress
        }
    })

    if (existingUser) {
        const token = jwt.sign({
            userId: existingUser.id
        }, JWT_SECRET)
        res.json({
            token
        })
    } else {

        const user = await prismaClient.user.create({
            data: {
                address: hardcodedWalletAddress,
            }
        })

        const token = jwt.sign({
            userId: user.id
        }, JWT_SECRET)

        res.json({
            token
        })
    }
});

export default router;