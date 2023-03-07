const { Program, Partner } = require('../model/model');
const Responses = require('../utils/api-responses');

module.exports.get = async (event, context, callback) => {
  try {
    const { Item: partner } = await Partner.get({ id: event.pathParameters.id });

    if (!partner) {
      return Responses._404({ message: `Partner ${event.pathParameters.id} not found` });
    }
    const { Item: program } = await Program.get({ id: partner.associatedProgram });
    partner.associatedProgram = program;
    
    return Responses._200(partner);
  } catch (error) {
    console.log('error', error);
    return Responses._400({ message: error.message || `Couldn\'t get the partner ${event.pathParameters.id}` });
  }
};
