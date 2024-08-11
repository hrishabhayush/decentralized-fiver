import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import jwt from "jsonwebtoken"
import { JWT_SECRET, TOTAL_DECIMALS } from "../config";
import { authMiddleware } from "../middleware";
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { createTaskInput } from "../types";

const DEFAULT_TITLE = "Select the most engaging thumbnail/picture";

const s3Client = new S3Client({
    credentials: {
        accessKeyId: process.env.ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.ACCESS_SECRET ?? "",
    },
    region: "us-east-1"
})

const router = Router();

const prismaClient = new PrismaClient();

router.get("/task", authMiddleware, async (req, res) => {
    // @ts-ignore
    const taskId: string = req.query.taskId;
    // @ts-ignore
    const userId: string = req.userId;

    // Fetch task details to verify access
    const taskDetails = await prismaClient.task.findFirst({
        where: {
            user_id: Number(userId),
            id: Number(taskId)
        },
        include: {
            options: true
        }
    })
    
    if (!taskDetails) {
        return res.status(411).json({
            message: "You don't have access to the this task."
        })
    }

    // TODO: Make this faster - Use aggregation to count submissions by option
    const responses = await prismaClient.submission.findMany({
        where: {
            task_id: Number(taskId)
        }, 
        include: {
            option: true
        }
    });

    const result: Record<string, {
        count: number;
        option: {
            imageUrl: string
        }
    }> = {};

    taskDetails.options.forEach(option => {
        result[option.id] = {
            count: 0, 
            option: {
                imageUrl: option.image_url
            }
        }
    })

    responses.forEach(r => {
        result[r.option_id].count++;
     })

    res.json({
        result
    })

});

router.post("/task", authMiddleware, async (req, res) => {
    //@ts-ignore
    const userId = req.userId
    // validate the inputs from the user;
    const body = req.body;

    const parseData = createTaskInput.safeParse(body);

    if (!parseData.success) {
        return res.status(411).json({
            message: "You've sent the wrong inputs",
        })
    }

    // parse the signature to ensure the user has paid

    let response = await prismaClient.$transaction(async tx => {

        const response = await tx.task.create({
            data: {
                title: parseData.data.title ?? DEFAULT_TITLE,
                amount: 1 * TOTAL_DECIMALS,
                //TODO: Signature should be unique in the table else people can reuse a signature
                signature: parseData.data.signature,
                user_id: userId
            }
        });

        await tx.option.createMany({
            data: parseData.data.options.map(x => ({
                image_url: x.imageUrl,
                task_id: response.id
            }))
        })

        return response;

    })

    res.json({
        id: response.id
    })

});

router.get("/presignedUrl", authMiddleware, async (req, res) => {
    // @ts-ignore
    const userId = req.userId; 

    const { url, fields } = await createPresignedPost(s3Client, {
        Bucket: 'decentralized-apps',
        Key: `fiver/${userId}/${Math.random()}/image.jpg`,
        Conditions: [
          ['content-length-range', 0, 5 * 1024 * 1024] // 5 MB max
        ],
        Fields: {
          'Content-Type': 'image/png'
        },
        Expires: 3600
    })

    res.json({
        preSignedUrl: url, 
        fields
    })
});

// sign in with wallet (most decentralized applications follow this where you 
// connect with Phantom wallet)
// signing a message
router.post("/signin", async(req, res) => {
    // TODO: Add sign verification logic here
    const hardcodedWalletAddress = process.env.WALLET_ADDRESS ?? "";

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