"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOTAL_DECIMALS = exports.WORKER_JWT_SECRET = exports.JWT_SECRET = void 0;
exports.JWT_SECRET = (_a = process.env.JWT_SECRET) !== null && _a !== void 0 ? _a : "hrishabh123";
exports.WORKER_JWT_SECRET = exports.JWT_SECRET + "worker";
exports.TOTAL_DECIMALS = 1000000;
