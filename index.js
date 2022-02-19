const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const fs = require("fs");
const groupBy = require("lodash.groupby");

function createWriter(filename, txHashField) {
  const txHash = txHashField ? [{ id: "txHash", title: "TxHash" }] : [];
  return createCsvWriter({
    path: `${filename}.csv`, // path to write processed csv file to
    header: [
      { id: "koinlyDate", title: "Koinly Date" },
      { id: "amount", title: "Amount" },
      { id: "currency", title: "Currency" },
      { id: "label", title: "Label" },
      { id: "feeAmount", title: "Fee Amount" },
      { id: "feeCurrency", title: "Fee Currency" },
      ...txHash,
    ],
  });
}

async function readChannels() {
  const channels = await getData("channels");
  return channels.map(({ remote_pubkey, chan_id, channel }) => {
    return {
      publicKey: remote_pubkey,
      channelId: chan_id,
    };
  });
}

function getData(key) {
  return new Promise((resolve, reject) => {
    fs.readFile(`./data/${key}.json`, "utf8", (error, data) => {
      if (error) return reject(error);
      return resolve(JSON.parse(data));
    });
  });
}

function groupByChannel(payments) {
  const filtered = payments.filter(({ htlcs }) => !!htlcs[0]);

  return groupBy(filtered, ({ htlcs }) => {
    const [htlc] = htlcs;
    if (htlc.route) {
      return htlc.route.hops[0].chan_id;
    }

    return htlc.chan_id;
  });
}

async function processPayments() {
  const payments = await getData("payments");
  const groupedPayments = await groupByChannel(payments);
  const channels = await readChannels();

  return Promise.all(
    Object.entries(groupedPayments).map(([chanId, payments]) => {
      const channel = channels.find(({ channelId }) => chanId === channelId);

      const csvFormatPayments = payments.map(
        ({ value_sat, creation_date, fee_sat }) => {
          return {
            koinlyDate: new Date(creation_date * 1000).toUTCString(),
            amount: `-${(value_sat * 1e-8).toFixed(8)}`,
            currency: "BTC",
            feeCurrency: "BTC",
            feeAmount: (fee_sat * 1e-8).toFixed(8),
            label: `send - PK: ${
              channel && channel.publicKey
            } | CHANNEL: ${chanId}`,
          };
        }
      );

      return createWriter(`processed/payments/${chanId}`)
        .writeRecords(csvFormatPayments)
        .then(() => console.log(`csv written for ${chanId}`));
    })
  );
}

async function processInvoices() {
  const invoices = await getData("invoices");
  const groupedInvoices = await groupByChannel(invoices);
  const channels = await readChannels();

  return Promise.all(
    Object.entries(groupedInvoices).map(([chanId, invoices]) => {
      const channel = channels.find(({ channelId }) => chanId === channelId);

      const csvFormatPayments = invoices.map(({ value, creation_date }) => {
        return {
          koinlyDate: new Date(creation_date * 1000).toUTCString(),
          amount: `${(value * 1e-8).toFixed(8)}`,
          currency: "BTC",
          feeCurrency: "BTC",
          label: `receive - PK: ${
            channel && channel.publicKey
          } | CHANNEL: ${chanId}`,
        };
      });

      return createWriter(`processed/invoices/${chanId}`)
        .writeRecords(csvFormatPayments)
        .then(() => console.log(`csv written for ${chanId}`));
    })
  );
}

async function processForwards() {
  const forwards = await getData("forwards");

  const formattedForwards = forwards.reduce(
    (acc, { chan_id_in, chan_id_out, timestamp, amt_in, amt_out }) => {
      if (!acc[chan_id_in]) {
        acc[chan_id_in] = [];
      }

      if (!acc[chan_id_out]) {
        acc[chan_id_out] = [];
      }

      acc[chan_id_in].push({
        koinlyDate: new Date(timestamp * 1000).toUTCString(),
        amount: `${(amt_in * 1e-8).toFixed(8)}`,
        currency: "BTC",
        label: `forward-in | CHANNEL: ${chan_id_in}`,
      });

      acc[chan_id_out].push({
        koinlyDate: new Date(timestamp * 1000).toUTCString(),
        amount: `-${(amt_out * 1e-8).toFixed(8)}`,
        currency: "BTC",
        label: `forward-out | CHANNEL: ${chan_id_out}`,
      });

      return acc;
    },
    {}
  );

  Promise.all(
    Object.entries(formattedForwards).map(([channelId, payments]) => {
      return createWriter(`processed/forwards/${channelId}`)
        .writeRecords(payments)
        .then(() => console.log(`csv written for ${channelId}`));
    })
  );
}

async function processChain() {
  const chainTxs = await getData("chain");

  const formattedTxns = chainTxs.map(
    ({ tx_hash, amount, time_stamp, total_fees, label }) => ({
      koinlyDate: new Date(time_stamp * 1000).toUTCString(),
      amount: (amount * 1e-8).toFixed(8),
      currency: "BTC",
      feeCurrency: "BTC",
      feeAmount: (total_fees * 1e-8).toFixed(8),
      label,
      txHash: tx_hash,
    })
  );

  return createWriter("processed/chain", true)
    .writeRecords(formattedTxns)
    .then(() => console.log("csv written for chain txns"));
}

async function run() {
  try {
    await processPayments();
  } catch (error) {
    console.error(error);
  }

  try {
    await processInvoices();
  } catch (error) {
    console.error(error);
  }

  try {
    await processForwards();
  } catch (error) {
    console.error(error);
  }

  try {
    await processChain();
  } catch (error) {
    console.error(error);
  }
}

run();
