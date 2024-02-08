// app/wallet.tsx
"use client";

import {
    Button,
} from '@chakra-ui/react';

import { useState, useEffect } from "react";
//@ts-ignore
import { getPaths } from "@pioneer-platform/pioneer-coins"; // Corrected import to use the new hook
//@ts-ignore
import { ChainToNetworkId, getChainEnumValue, availableChainsByWallet, WalletOption } from '@coinmasters/types';
import { AssetValue } from '@coinmasters/core';
import { keepkeyWallet } from '@coinmasters/wallet-keepkey';
import { parse } from 'path';
import { assert } from 'console';

interface KeepKeyWallet {
    type: string;
    icon: string;
    chains: string[];
    wallet: any;
    status: string;
    isConnected: boolean;
}

const getWalletByChain = async (keepkey: any, chain: any) => {
    if (!keepkey[chain]) return null;

    const walletMethods = keepkey[chain].walletMethods;
    const address = await walletMethods.getAddress();
    if (!address) return null;

    let balance = [];
    if (walletMethods.getPubkeys) {
        const pubkeys = await walletMethods.getPubkeys();
        for (const pubkey of pubkeys) {
            const pubkeyBalance = await walletMethods.getBalance([{ pubkey }]);
            balance.push(Number(pubkeyBalance[0].toFixed(pubkeyBalance[0].decimal)) || 0);
        }
        balance = [{ total: balance.reduce((a, b) => a + b, 0), address }];
    } else {
        balance = await walletMethods.getBalance([{ address }]);
    }

    return { address, balance };
};


export default function Wallet({ setKeepKey, keepkey }: any) {
    const [asset, setAsset] = useState<string>("");
    const [amount, setAmount] = useState<string>("");
    const [destination, setDestination] = useState<string>(""); // Add destination state if required
    const [keepkeyInstance, setKeepKeyInstance] = useState<KeepKeyWallet | null>(null);

    //useEffect

    //start the context provider
    // useEffect(() => {
    //     initWallet()
    // }, []);

    let initWallet = async (): Promise<KeepKeyWallet> => {
        try {
            // let chains =  [
            //     'ARB',  'AVAX', 'BNB',
            //     'BSC',  'BTC',  'BCH',
            //     'GAIA', 'OSMO', 'XRP',
            //     'DOGE', 'DASH', 'ETH',
            //     'LTC',  'OP',   'MATIC',
            //     'THOR'
            // ]

            const chains = ['BTC', 'ETH', 'MAYA']; // Example chains
            const { keepkeyWallet } = await import('@coinmasters/wallet-keepkey');
            const walletKeepKey: KeepKeyWallet = {
                type: 'KEEPKEY',
                icon: 'https://pioneers.dev/coins/keepkey.png',
                chains,
                wallet: keepkeyWallet,
                status: 'offline',
                isConnected: false,
            };

            const allByCaip = chains.map((chainStr) => {
                const chain = getChainEnumValue(chainStr);
                if (chain) {
                    return ChainToNetworkId[chain];
                }
                return undefined;
            });
            const paths = getPaths(allByCaip);
            console.log('paths: ', paths);
            let keepkey: any = {};
            // @ts-ignore
            // Implement the addChain function with additional logging
            function addChain({ chain, walletMethods, wallet }) {
                console.log(`Adding chain: ${chain}`);
                console.log(`Chain data:`, { chain, walletMethods, wallet });
                keepkey[chain] = {
                    walletMethods,
                    wallet
                };
            }

            let keepkeyConfig = {
                apiKey: localStorage.getItem('keepkeyApiKey') || '123',
                pairingInfo: {
                    name: "int-test-package",
                    imageUrl: "",
                    basePath: 'http://localhost:1646/spec/swagger.json',
                    url: 'http://localhost:1646',
                }
            }
            let covalentApiKey = process.env['NEXT_PUBLIC_COVALENT_API_KEY']
            let ethplorerApiKey = process.env['NEXT_PUBLIC_ETHPLORER_API_KEY']
            let utxoApiKey = process.env['NEXT_PUBLIC_BLOCKCHAIR_API_KEY']
            let input = {
                apis: {},
                rpcUrls: {},
                addChain,
                config: { keepkeyConfig, covalentApiKey, ethplorerApiKey, utxoApiKey },
            }
            console.log("input: ", input)

            // Step 1: Invoke the outer function with the input object
            const connectFunction = walletKeepKey.wallet.connect(input);

            // Step 2: Invoke the inner function with chains and paths
            let kkApikey = await connectFunction(chains, paths);
            console.log("kkApikey: ", kkApikey);
            localStorage.setItem('keepkeyApiKey', kkApikey);

            //got balances
            for (let i = 0; i < chains.length; i++) {
                let chain = chains[i]
                let walletData: any = await getWalletByChain(keepkey, chain);
                console.log(chain + " walletData: ", walletData)
                // keepkey[chain].wallet.address = walletData.address
                keepkey[chain].wallet.balance = walletData.balance
            }

            // Additional setup or connection logic here

            return keepkey;
        } catch (error) {
            console.error(error);
            throw new Error('Failed to initialize wallet');
        }
    };

    const init = async () => {
        try {
            console.log("Fuck you fucker")
            let keepkeyInit = await initWallet();
            console.log("keepkey: ", keepkeyInit);
            setKeepKey(keepkeyInit);
            setKeepKeyInstance(keepkeyInit)
        } catch (error) {
            console.error("Failed to initialize wallet", error);
        }
    };

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        let asset = "ETH"
        let amount = 0.00001
        let destination = "0x41CB654D1F47913ACAB158a8199191D160DAbe4A"
        if (!asset || !amount) return;
        //@ts-ignore
        if (asset === "ETH" && keepkeyInstance.ETH.walletMethods) {
            try {
                const assetString = `${asset}.${asset}`
                await AssetValue.loadStaticAssets();
                console.info("Amount Type: ", typeof (amount))

                let assetValue = await AssetValue.fromString(
                    assetString,
                    amount
                )
                console.info("assetValue: ", assetValue)

                let sendPayload = {
                    assetValue,
                    memo: '',
                    recipient: destination,
                }
                console.info(sendPayload)
                //@ts-ignore
                const txHash = await keepkeyInstance.ETH.walletMethods.transfer(sendPayload);
                console.log("txHash: ", txHash);
                //@ts-ignore
                console.log("Transfer successful");
            } catch (error) {
                console.error("Transfer failed", error);
            }
        }
    };

    return (
        <div>
            <Button size={'xl'}
                onClick={init}>
                Connect Wallet
            </Button>
            <br />
            <Button size={'xl'}
                onClick={handleTransfer}>
                Transfer 0.00001 ETH
            </Button>
        </div>
    );
}
