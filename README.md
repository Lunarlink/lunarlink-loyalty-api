<p align="center">
  <img src="https://moonforge.s3.eu-west-1.amazonaws.com/lunarlink-logo.png">
</p>

--------------------------------------------------------------------

LunarLink enables businesses to create and manage loyalty programs, enroll users, manage rewards, and track transactions. It enables seamless integration with Solana Pay, enabling secure, instant and seamless payment transactions. LunarLink utilizes digital assets to connect businesses worldwide, allowing them to offer better customer experiences and increase user retention, also providing businesses with a way to analyze their loyalty program performance, generate reports, and gain insights into customer behavior.

## Setup

```bash
npm install
serverless dynamodb install (or to use a persistent docker dynamodb instead, open a new terminal: cd ./dynamodb && docker-compose up -d)
serverless offline start
```

## Run service offline

```bash
serverless offline start
```

## Usage

You can create, retrieve, list programs; add partners and execute transactions using following endpoints:

### List Programs

`GET /program/`

### Get Program

`GET /program/:id`

### Create a Program

`POST /program/`

    {
        "tokenName": "Moon Point",
        "tokenSymbol": "MP",
        "type": "points",
        "image": "...",
        "settings": { "decimals": 2, "rewardRate": 5, "multiplier": 10 },
        "organizer": "Org",
        "name": "Lunar loyalty",
        "description": "Lunar program linking businesses and user all over the world rocketing everyone to the moon",
        "email": "org@lunarlink.io"
    }

### Get Partner

`GET /partner/:id`

### Add partner to Program

`POST /program/:id/addpartner`

    {
	    "name": "Moonstore",
	    "description": "Moon equipment",
	    "email": "moon@lunarlink.io",
	    "walletAddress": "" // optional
	}
