const { SystemProgram, Keypair, Connection, TransactionMessage, clusterApiUrl, VersionedTransaction } = require("@solana/web3.js");
const { MINT_SIZE, TOKEN_PROGRAM_ID, createInitializeMintInstruction, getMinimumBalanceForRentExemptMint } = require('@solana/spl-token');
const { createCreateMetadataAccountV2Instruction } = require('@metaplex-foundation/mpl-token-metadata');
const { bundlrStorage, keypairIdentity, Metaplex } = require('@metaplex-foundation/js');
const base58 = require('bs58');
const config = require('../utils/config');

module.exports = async (wallet, tokenName, tokenSymbol, image, description, decimals) => {

    const endpoint = clusterApiUrl(config.solanaNet)
    const connection = new Connection(endpoint)

    const systemWallet = Keypair.fromSecretKey(base58.decode(wallet))

    const tokenMetadata = {
        name: tokenName,
        symbol: tokenSymbol,
        description: description,
        image: image
    }

    const metaplex = Metaplex.make(connection)
        .use(keypairIdentity(systemWallet))
        .use(bundlrStorage({
            address: `https://${config.solanaNet}.bundlr.network`,
            providerUrl: `https://api.${config.solanaNet}.solana.com`,
            timeout: 60000,
        }));

    //Upload to Arweave
    const { uri } = await metaplex.nfts().uploadMetadata(tokenMetadata);

    //Create new Keypair for Mint address
    const mintKeypair = Keypair.generate();

    const onChainMetadata = {
        name: tokenMetadata.name,
        symbol: tokenMetadata.symbol,
        uri: uri,
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null
    }

    //Get the minimum lamport balance to create a new account and avoid rent payments
    const requiredBalance = await getMinimumBalanceForRentExemptMint(connection);
    //metadata account associated with mint
    const metadataPDA = await metaplex.nfts().pdas().metadata({ mint: mintKeypair.publicKey });

    const txInstructions = [];
    txInstructions.push(
        SystemProgram.createAccount({
            fromPubkey: systemWallet.publicKey,
            newAccountPubkey: mintKeypair.publicKey,
            space: MINT_SIZE,
            lamports: requiredBalance,
            programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
            mintKeypair.publicKey, //Mint Address
            decimals, //Number of Decimals of New mint
            systemWallet.publicKey, //Mint Authority
            systemWallet.publicKey, //Freeze Authority
            TOKEN_PROGRAM_ID),
        createCreateMetadataAccountV2Instruction({
            metadata: metadataPDA,
            mint: mintKeypair.publicKey,
            mintAuthority: systemWallet.publicKey,
            payer: systemWallet.publicKey,
            updateAuthority: systemWallet.publicKey,
        },
            {
                createMetadataAccountArgsV2:
                {
                    data: onChainMetadata,
                    isMutable: true
                }
            }
        )
    );
    const latestBlockhash = await connection.getLatestBlockhash();
    const messageV0 = new TransactionMessage({
        payerKey: systemWallet.publicKey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions: txInstructions
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([systemWallet, mintKeypair]);
    const transactionId = await connection.sendTransaction(transaction);

    console.log("Creating token mint: ", mintKeypair.publicKey.toString());

    return mintKeypair.publicKey.toString();
}