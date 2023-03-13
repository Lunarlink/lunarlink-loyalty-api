const { Program } = require('../model/model');
const Responses = require('../utils/api-responses');

module.exports.list = async (event, context, callback) => {
  try {
    const result = await Program.scan();
    const programs = result.Items.filter((e) => e.entity === 'Program');
    return Responses._200(programs);
  }
  catch (error) {
    console.log('error', error);
    return Responses._400({ message: error.message || 'Couldn\'t get the program' });
  }
};
