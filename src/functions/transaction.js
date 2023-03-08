const { Program, Partner } = require('../model/model');
const Responses = require('../utils/api-responses');
const config = require('../utils/config');
const {clusterApiUrl, Connection, Keypair, PublicKey, Transaction} = require('@solana/web3.js');
const {createBurnCheckedInstruction, createMintToCheckedInstruction, createTransferCheckedInstruction, getAssociatedTokenAddress, getMint, getOrCreateAssociatedTokenAccount, mintToChecked} = require('@solana/spl-token');
const base58 = require('bs58');

module.exports.get = async (event, context, callback) => {
    try {
        console.log(JSON.stringify(event));
        return Responses._200({
            label: 'LunarLink Loyalty',
            icon: process.env.ICON,
        });
    }
    catch (error) {
        console.log('error', error);
        return Responses._400({ message: error.message || 'Couldn\'t get the account' });
    }
};

module.exports.post = async (event, context, callback) => {
    try {
        const body = JSON.parse(event.body);
        const reqParams = event.queryStringParameters;

        console.log("Request payload: ", body);
        console.log("Request params: ", reqParams);

        const {
            amount: amount = amount.toNumber(),
            reference,
            pid,
        } = reqParams;

        if (amount === 0) {
            return Responses._400({ error: "Can't checkout with charge of 0" });
        }

        // pass the reference to use in the query
        if (!reference) {
            return Responses._400({ error: 'No reference provided' });
        }

        // buyer's public key in JSON body
        const account = body.account;
        if (!account) {
            return Responses._400({ error: 'No account provided' });
        }

        const { Item: partner } = await Partner.get({ id: pid });
        const { Item: program } = await Program.get({ id: partner.associatedProgram });

        const tokenAddress = new PublicKey(program.tokenAddress);
        const usdcAddress = new PublicKey(config.usdcAddress);
        const systemWalletKeypair = Keypair.fromSecretKey(base58.decode(config.systemWallet));
        const buyerPublicKey = new PublicKey(account);
        const partnerPublicKey = new PublicKey(partner.walletAddress);

        const endpoint = clusterApiUrl(config.solanaNet);
        const connection = new Connection(endpoint);

        // Get details about the tokens
        const usdcMint = await getMint(connection, usdcAddress);
        const tokenMint = await getMint(connection, tokenAddress);

        // Get or create token accounts
        const buyerUsdcAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            systemWalletKeypair, // fee payer
            usdcAddress, // token
            buyerPublicKey // owner account
        );
        console.log("Buyer's USDC account: ", buyerUsdcAccount);
        
        const buyerTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            systemWalletKeypair,
            tokenAddress,
            buyerPublicKey
        );
        console.log("Buyer's token account: ", buyerTokenAccount);

        const partnerUsdcAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            systemWalletKeypair,
            usdcAddress,
            partnerPublicKey
        );
        console.log("Partner's USDC account: ", partnerUsdcAccount);

        // Get the buyer's USDC token account address
        const buyerUsdcAddress = await getAssociatedTokenAddress(
            usdcAddress,
            buyerPublicKey
        );

        // Get a recent blockhash to include in the transaction
        const { blockhash, lastValidBlockHeight } =
            await connection.getLatestBlockhash('finalized');

        const transaction = new Transaction({
            blockhash,
            lastValidBlockHeight,
            feePayer: systemWalletKeypair.publicKey,
        });

        const buyerPointsAmount = Number(buyerTokenAccount.amount) / 10 ** tokenMint.decimals;
        const usePoints = (reqParams.usePoints && reqParams.usePoints == 'true' && buyerPointsAmount > 0)
            ? true : false;
        console.log("Buyer points amount: ", buyerPointsAmount);
        
        let amountToPay = amount;
        let pointsUsed = 0;
        let rewardPoints = 0;

        if (usePoints) {
            if (amountToPay <= buyerPointsAmount) {
                pointsUsed = amountToPay;
                amountToPay = 0;
            } else {
                amountToPay = amountToPay - buyerPointsAmount;
                pointsUsed = buyerPointsAmount;
            }
        } else {
            //calulate reward based on amountToPay
            rewardPoints = amountToPay * program.settings.rewardRate / 100;
        }
        const usdcAmount = Number(buyerUsdcAccount.amount) / 10 ** usdcMint.decimals;
        console.log("Buyer usdc amount: ", usdcAmount);
        console.log("Amount to pay: ", amountToPay);
        console.log("Reward points: ", rewardPoints);
        console.log("Points used: ", pointsUsed);
        if (amountToPay > usdcAmount) {
            console.log("Insufficient funds - buyer's USDC amount");
            throw new Error('Insufficient funds - USDC');
        }
        // instruction to send USDC from the buyer to the partner
        const transferInstruction = createTransferCheckedInstruction(
            buyerUsdcAddress, // source
            usdcAddress, // token address
            partnerUsdcAccount.address, // destination
            buyerPublicKey, // owner of source address
            Math.round(amountToPay * 10 ** usdcMint.decimals), // amount to transfer
            usdcMint.decimals // decimals of the token
        );

        // reference to the instruction as a key, used in the query for transaction
        transferInstruction.keys.push({
            pubkey: new PublicKey(reference),
            isSigner: false,
            isWritable: false,
        });

        // Burn (or send to partner) the buyer's tokens
        const consumePointsInstruction = createBurnCheckedInstruction(
            buyerTokenAccount.address, // token account
            tokenAddress, // token mint
            buyerPublicKey, // owner
            Math.round(pointsUsed * 10 ** tokenMint.decimals), // amount
            tokenMint.decimals // decimals
        );

        // send reward points to buyer
        const rewardPointsInstruction = createMintToCheckedInstruction(
            tokenAddress, // token
            buyerTokenAccount.address, // buyer's token account
            systemWalletKeypair.publicKey, // mint authority
            Math.round(rewardPoints * 10 ** tokenMint.decimals), // amount
            tokenMint.decimals
        );

        // Add instructions to the transaction
        transaction.add(transferInstruction, consumePointsInstruction, rewardPointsInstruction);

        // Sign the transaction
        transaction.sign(systemWalletKeypair);

        // Serialize the transaction
        const serializedTransaction = transaction.serialize({
            // We will need the buyer to sign this transaction after it's returned to them
            requireAllSignatures: false,
        })
        const base64 = serializedTransaction.toString('base64')

        const message = 'Thank you for purchase! 🚀';

        return Responses._200({
            transaction: base64,
            message,
            network: config.solanaNet,
        });

    } catch (error) {
        console.error('error', error);
        return Responses._500({ error: error.message || 'failed to execute transaction' });
    };

};