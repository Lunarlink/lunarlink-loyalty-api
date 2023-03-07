const { Program } = require('../model/model');
const Responses = require('../utils/api-responses');

module.exports.list = async (event, context, callback) => {
  try {
    const result = await Program.scan();
    return Responses._200(result.Items);
  }
  catch (error) {
    console.log('error', error);
    return Responses._400({ message: error.message || 'Couldn\'t get the program' });
  }
};
