"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const express_1 = require("express");
const client_s3_1 = require("@aws-sdk/client-s3");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const middleware_1 = require("../middleware");
const s3_presigned_post_1 = require("@aws-sdk/s3-presigned-post");
const types_1 = require("../types");
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const web3_js_1 = require("@solana/web3.js");
const connection = new web3_js_1.Connection('https://solana-mainnet.g.alchemy.com/v2/3GHuEu4-cXEuE8jDAZW3EFgTedkyJ0K3');
const PARENT_WALLET_ADDRESS = "7W5nwpKWd4MfocNsXHNdUmhngziVRjL4fuyBHrJG4kZC";
const DEFAULT_TITLE = "Select the most engaging thumbnail/picture";
const s3Client = new client_s3_1.S3Client({
    credentials: {
        accessKeyId: (_a = process.env.ACCESS_KEY_ID) !== null && _a !== void 0 ? _a : "",
        secretAccessKey: (_b = process.env.ACCESS_SECRET) !== null && _b !== void 0 ? _b : "",
    },
    region: "us-east-1"
});
const router = (0, express_1.Router)();
const prismaClient = new client_1.PrismaClient();
prismaClient.$transaction((prisma) => __awaiter(void 0, void 0, void 0, function* () {
    // Code running in a transaction ...
}), {
    maxWait: 5000, // default: 2000
    timeout: 10000, // default: 5000
});
router.get("/task", middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    //@ts-ignore
    const userId = req.userId;
    // validate the inputs from the user;
    const body = req.body;
    const parseData = types_1.createTaskInput.safeParse(body);
    const user = yield prismaClient.user.findFirst({
        where: {
            id: userId
        }
    });
    if (!parseData.success) {
        return res.status(411).json({
            message: "You've sent the wrong inputs"
        });
    }
    const transaction = yield connection.getTransaction(parseData.data.signature, {
        maxSupportedTransactionVersion: 1
    });
    console.log(transaction);
    if (((_b = (_a = transaction === null || transaction === void 0 ? void 0 : transaction.meta) === null || _a === void 0 ? void 0 : _a.postBalances[1]) !== null && _b !== void 0 ? _b : 0) - ((_d = (_c = transaction === null || transaction === void 0 ? void 0 : transaction.meta) === null || _c === void 0 ? void 0 : _c.preBalances[1]) !== null && _d !== void 0 ? _d : 0) !== 100000) {
        return res.status(411).json({
            message: "Transaction signature/amount incorrect"
        });
    }
    if (((_e = transaction === null || transaction === void 0 ? void 0 : transaction.transaction.message.getAccountKeys().get(1)) === null || _e === void 0 ? void 0 : _e.toString()) !== PARENT_WALLET_ADDRESS) {
        return res.status(411).json({
            message: "Transaction sent to wrong address"
        });
    }
    if (((_f = transaction === null || transaction === void 0 ? void 0 : transaction.transaction.message.getAccountKeys().get(0)) === null || _f === void 0 ? void 0 : _f.toString()) !== (user === null || user === void 0 ? void 0 : user.address)) {
        return res.status(411).json({
            message: "Transaction sent to wrong address"
        });
    }
    // was this money paid by this user address or a different address?
    // parse the signature here to ensure the person has paid 0.1 SOL
    // const transaction = Transaction.from(parseData.data.signature);
    let response = yield prismaClient.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const response = yield tx.task.create({
            data: {
                title: (_a = parseData.data.title) !== null && _a !== void 0 ? _a : DEFAULT_TITLE,
                amount: 1 * config_1.TOTAL_DECIMALS,
                //TODO: Signature should be unique in the table else people can reuse a signature
                signature: parseData.data.signature,
                user_id: userId
            }
        });
        yield tx.option.createMany({
            data: parseData.data.options.map(x => ({
                image_url: x.imageUrl,
                task_id: response.id
            }))
        });
        return response;
    }));
    res.json({
        id: response.id
    });
}));
router.post("/task", middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //@ts-ignore
    const userId = req.userId;
    // validate the inputs from the user;
    const body = req.body;
    const parseData = types_1.createTaskInput.safeParse(body);
    const user = yield prismaClient.user.findFirst({
        where: {
            id: userId
        }
    });
    if (!parseData.success) {
        return res.status(411).json({
            message: "You've sent the wrong inputs",
        });
    }
    // parse the signature to ensure the user has paid
    let response = yield prismaClient.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const response = yield tx.task.create({
            data: {
                title: (_a = parseData.data.title) !== null && _a !== void 0 ? _a : DEFAULT_TITLE,
                amount: 0.1 * config_1.TOTAL_DECIMALS,
                //TODO: Signature should be unique in the table else people can reuse a signature
                signature: parseData.data.signature,
                user_id: userId
            }
        });
        yield tx.option.createMany({
            data: parseData.data.options.map(x => ({
                image_url: x.imageUrl,
                task_id: response.id
            }))
        });
        return response;
    }));
    res.json({
        id: response.id
    });
}));
router.get("/presignedUrl", middleware_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // @ts-ignore
    const userId = req.userId;
    const { url, fields } = yield (0, s3_presigned_post_1.createPresignedPost)(s3Client, {
        Bucket: 'decentralized-apps',
        Key: `fiver/${userId}/${Math.random()}/image.jpg`,
        Conditions: [
            ['content-length-range', 0, 5 * 1024 * 1024] // 5 MB max
        ],
        Fields: {
            'Content-Type': 'image/png'
        },
        Expires: 3600
    });
    res.json({
        preSignedUrl: url,
        fields
    });
}));
// sign in with wallet (most decentralized applications follow this where you 
// connect with Phantom wallet)
// signing a message
router.post("/signin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // sign verification logic here
    const { publicKey, signature } = req.body;
    const message = new TextEncoder().encode("Sign in to decentralized fiver website");
    const result = tweetnacl_1.default.sign.detached.verify(message, new Uint8Array(signature.data), new web3_js_1.PublicKey(publicKey).toBytes());
    console.log(result);
    // If the user with this wallet address already exists, then it will just return userId
    // Otherwise creates the userId for that user
    const existingUser = yield prismaClient.user.findFirst({
        where: {
            address: publicKey
        }
    });
    if (existingUser) {
        const token = jsonwebtoken_1.default.sign({
            userId: existingUser.id
        }, config_1.JWT_SECRET);
        res.json({
            token
        });
    }
    else {
        const user = yield prismaClient.user.create({
            data: {
                address: publicKey,
            }
        });
        const token = jsonwebtoken_1.default.sign({
            userId: user.id
        }, config_1.JWT_SECRET);
        res.json({
            token
        });
    }
}));
exports.default = router;
