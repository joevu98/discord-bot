require("dotenv").config();

const Discord = require("discord.js");
const rp = require("request-promise");
const { tokenPrice } = require("./fetch/cmcAPI");
const { whaleTranfer } = require("./fetch/whaleAPI");
const { colors } = require("./constant/strings");
const client = new Discord.Client();
client.login(process.env.DISCORDJS_BOT_TOKEN);
const { pricePrefix, generalChannelID, botSpamChannelID } = require("./config.json");

client.on("message", (message) => {
  if (message.author.bot) return;
  const { content } = message;
  const prefix = content[0];
  const commandName = content.trim().slice(1).toUpperCase();

  const getPrice = async (symbol) => {
    const { description } = await tokenPrice({ symbol });
    message.channel.send({ embed: { color: colors.primary, description } });
  };
  switch (prefix) {
    case pricePrefix:
      getPrice(commandName);
      break;
    default:
      return;
  }
});

client.once("ready", async () => {
  const generalRoom = client.channels.cache.get(generalChannelID);

  let prevTimespan = null;
  let prevTransactionHash = null;
  
  let btcPricePrev = 0;

  const whale = setInterval(() => {
    const checkWhaleTranfer = async () => {
      const result = await whaleTranfer();
      if (result) {
        const { timestamp, hash, description } = result;
        if (timestamp !== prevTimespan && hash !== prevTransactionHash) {
          prevTimespan = timestamp;
          prevTransactionHash = hash;
          generalRoom.send({ embed: { color: colors.warning, description } });
        }
      }
    };
    checkWhaleTranfer();
  }, 60000);

  const btc = setInterval(() => {
    const btcPrice = async () => {
      const { price } = await tokenPrice({ symbol: "BTC" });
      if(btcPricePrev){
        const isIncreased = price > btcPricePrev
        const percent = Number.parseFloat((Math.abs(price - btcPricePrev) / btcPricePrev) * 100).toFixed(2);
        const color = isIncreased ? colors.success : colors.danger
        const description = `
        BTC: ${price} USD,
        ${isIncreased ? "Increased" : "Decreased"} by ${percent}% in the last 30 minutes
        `; 
        generalRoom.send({ embed: { color, description } });
      }
      btcPricePrev = price;
    };
    btcPrice();
  }, 1800000);
});
