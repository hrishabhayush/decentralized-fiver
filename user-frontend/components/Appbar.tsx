"use client";
import {
    WalletDisconnectButton,
    WalletModalProvider,
    WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, FC } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '@/utils';
require("@solana/wallet-adapter-react-ui/styles.css");

export const Appbar : FC = () => {
    const { publicKey , signMessage } = useWallet();

    async function signAndSend() {
        if (!publicKey) {
            return;
        }
        const message = new TextEncoder().encode("Sign into mechanical turks");
        const signature = await signMessage?.(message);
        console.log(signature);
        console.log(publicKey);
        const response = await axios.post(`${BACKEND_URL}/v1/user/signin`, {
            signature,
            publicKey: publicKey?.toString()
        });

        localStorage.setItem("token", response.data.token);
    }

    useEffect(() => {
        if (publicKey) {
            signAndSend();
        }
    }, [publicKey]);

    return <div className="flex justify-between border-b pb-2 pt-2 bg-gray-800 text-white">
        <div className="text-2xl pl-4 flex justify-center pt-3">
            Turkify
        </div>
        <div className="text-xl pr-4 pb-2">
            {publicKey ? <WalletDisconnectButton /> : <WalletMultiButton />}        
        </div>
    </div>
}