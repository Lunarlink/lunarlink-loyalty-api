const config = require('../utils/config');
const { Table, Entity } = require('dynamodb-toolbox');
const AWS = require('aws-sdk');

const options = process.env.IS_OFFLINE ?
        {
            region: 'localhost',
            endpoint: 'http://localhost:8000',
        } : {};
const DocumentClient = new AWS.DynamoDB.DocumentClient(options);
    
const MoonforgeTable = new Table({
    name: config.dynamoDBTable,

    partitionKey: 'pk',
    // sortKey: 'sk',

    DocumentClient
});

const Program = new Entity({
    name: 'Program',

    attributes: {
        pk: { partitionKey: true, prefix: 'program#', hidden: true },
        // sk: { sortKey: true, prefix: 'address#', hidden: true },
        id: ['pk', 0, { save: true }],
        tokenAddress: { type: 'string', default: '' }, //address
        tokenName: { type: 'string' },
        tokenSymbol: { type: 'string' },
        image: { type: 'string' },
        type: { type: 'string' }, // points, stamps (nft)
        settings: { type: 'map', default: {} }, // decimals, rewardRate, multiplier
        organizer: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        email: { type: 'string' },
        partners: { type: 'list', default: [] },
    },
    table: MoonforgeTable
});

const Partner = new Entity({
    name: 'Partner',

    attributes: {
        pk: { partitionKey: true, prefix: 'partner#', hidden: true },
        // sk: { sortKey: true, prefix: 'address#', hidden: true },
        id: ['pk', 0, { save: true }],
        walletAddress: { type: 'string', default: '' },
        associatedProgram: { type: 'string', default: '' },
        name: { type: 'string' },
        description: { type: 'string' },
        email: { type: 'string' },
    },
    table: MoonforgeTable
});

module.exports = { Program: Program, Partner: Partner };