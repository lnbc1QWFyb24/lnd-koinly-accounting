# LND Koinly Accounting

Just a couple of scripts to help format LND data to the Koinly CSV format for easy upload. It's a manual copy and paste process at the moment to get the data from LND. At some point I might set it up properly so that you can plug in node credentials and it will fetch the data from the node for you.

## Steps

- Install the deps: `npm i`

1. Export all current channels from lnd - `lncli listchannels`
   a. Export all closed channels from lnd - `lncli closedchannels`
2. Copy and paste array of JSON data in to a file called `channels.json` and place in the `/data` folder, then add the closed channels data to the end of the array (so closed and open channels are all included in one array of data)

3. Export all payments from lnd - `lncli listpayments`
4. Copy and paste array of JSON data in to a file called `payments.json` and place in the `/data` folder

5. Export all invoices (incoming payments) from lnd - `lncli listinvoices`
6. Copy and paste array of JSON data in to a file called `invoices.json` and place in the `/data` folder

7. Export all forwards from lnd - `lncli fwdinghistory --start_time <UNIX TIMESTAMP>`
8. Copy and paste array of JSON data in to a file called `forwards.json` and place in the `/data` folder

9. Export all chain transactions from lnd - `lncli listchaintxns`
10. Copy and paste array of JSON data in to a file called `chain.json` and place in the `/data` folder

11. Run the script - `node index.js`
12. It will output a series of csv files for each channel in the format that Koinly requires

All of the processed data will be written to the `/processed` folder and the CSV files are organised by channel. For accounting purposes, count each channel as "wallet" on Koinly. So opening a channel is essentially a transfer from the "<node-public-key>" wallet to the "<channel-id>" wallet. Payments get recorded as received and sent at the time they are sent off chain. When a channel is closed it is recorded as sending the local balance from the "<channel-id>" wallet to the "<node-public-key>" wallet.
