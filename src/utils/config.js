module.exports =
{
    dynamoDBTable: getEnv('DYNAMODB_TABLE'),
    systemWallet: getEnv('SYSTEM_WALLET'),
    solanaNet: getEnv('SOLANA_NET'),
    usdcAddress: getEnv('USDC_ADDRESS'),
};


function getEnv(name, defaultValue = undefined) {
    const value = process.env[name];

    if (value !== undefined) {
        return value;
    }
    if (defaultValue !== undefined) {
        return defaultValue;
    }
    throw new Error(`Environment variable '${name}' not set`);
}