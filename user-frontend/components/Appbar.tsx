"use client";
import {
    WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, FC, useState } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '@/utils';
require("@solana/wallet-adapter-react-ui/styles.css");

export const Appbar : FC = () => {
    const { publicKey , signMessage, disconnect } = useWallet();
    const [showDropdown, setShowDropdown] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    const truncateAddress = (address: string) => {
        return `${address.slice(0, 4)}...${address.slice(-4)}`;
    };

    async function signAndSend() {
        if (!publicKey) return;

        try {
            const message = new TextEncoder().encode("Sign into mechanical turks");
            const signature = await signMessage?.(message);
            console.log(signature);
            console.log(publicKey);
            const response = await axios.post(`${BACKEND_URL}/v1/user/signin`, {
                signature,
                publicKey: publicKey?.toString()
            });
            localStorage.setItem("token", response.data.token);
            setIsConnected(true);
        } catch (err) {
            console.error(err);
            await disconnect();
            setIsConnected(false);
        }
        

    }

    useEffect(() => {
        if (publicKey) {
            signAndSend();
        } else {
            setIsConnected(false);
        }
    }, [publicKey]);

    return ( <div className="flex justify-between border-b pb-2 pt-2 bg-gray-800 text-white">
        <div className="text-2xl pl-4 flex justify-center pt-3">
            Turkify
        </div>
        <div className="text-xl pr-4 pb-2 relative">
                {!isConnected ? (
                    <WalletMultiButton />
                ) : (
                    <div>
                        <button 
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="bg-gray-700 px-4 py-2 rounded-lg flex items-center gap-2"
                        >
                            {publicKey && truncateAddress(publicKey.toString())}
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        
                        {showDropdown && (
                            <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-gray-700 ring-1 ring-black ring-opacity-5">
                                <div className="py-1">
                                    <button
                                        onClick={async () => {
                                            await disconnect();
                                            setShowDropdown(false);
                                            setIsConnected(false);
                                        }}
                                        className="block px-4 py-2 text-sm text-white hover:bg-gray-600 w-full text-left"
                                    >
                                        Disconnect    
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowDropdown(false);
                                        }}
                                        className="block px-4 py-2 text-sm text-white hover:bg-gray-600 w-full text-left"
                                    >
                                        Change Wallet
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>    
        </div>
    );
}