const { Program, Partner } = require('../model/model');
const Responses = require('../utils/api-responses');
const { v4: uuidv4 } = require('uuid');
const { PublicKey, Keypair } = require("@solana/web3.js");

function createWallet() {
    const newPartnerWallet = Keypair.generate();
    // send secret key to partner
    return newPartnerWallet.publicKey.toString();
}

module.exports.addPartner = async (event, context, callback) => {
    try {
        const partner = JSON.parse(event.body);
        partner.id = uuidv4();

        const { Item: program } = await Program.get({ id: event.pathParameters.id });

        // check partner wallet address from input or generate new one
        try {
            if (!PublicKey.isOnCurve(new PublicKey(partner.walletAddress))) {
                partner.walletAddress = createWallet();
            }
        } catch {
            partner.walletAddress = createWallet();
        }

        partner.associatedProgram = program.id;
        program.partners.push(partner);
        await Program.put(program);
        await Partner.put(partner);

        return Responses._200(partner);

    } catch (error) {
        console.error('error', error);
        return Responses._400({ message: error.message || 'failed to add partner' });
    };
};
