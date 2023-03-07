const { Program } = require('../model/model');
const Responses = require('../utils/api-responses');

module.exports.get = async (event, context, callback) => {
  try {
    const { Item: program } = await Program.get({ id: event.pathParameters.id });
    if (!program) {
      return Responses._404({ message: `Program ${event.pathParameters.id} not found` });
    }
    return Responses._200(program);
  } catch (error) {
    console.log('error', error);
    return Responses._400({ message: error.message || `Couldn\'t get the program ${event.pathParameters.id}` });
  }
};
