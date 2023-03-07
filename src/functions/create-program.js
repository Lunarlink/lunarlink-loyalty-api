const { Program } = require('../model/model');
const Responses = require('../utils/api-responses');
const config = require('../utils/config');
const { v4: uuidv4 } = require('uuid');
const createToken = require('../tokens/create-points');

module.exports.createProgram = async (event, context, callback) => {
  try {
    const data = JSON.parse(event.body);
    data.id = uuidv4();

    const tokenAddress = await createToken(config.systemWallet, data.tokenName, data.tokenSymbol, data.image, data.description, data.settings.decimals);
    data.tokenAddress = tokenAddress;

    await Program.put(data);

    return Responses._200(data);

  } catch (error) {
    console.error('error', error);
    return Responses._400({ message: error.message || 'failed to create program' });
  };
};
