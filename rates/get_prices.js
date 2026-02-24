import asyncAuto from 'async/auto.js';
import asyncMap from 'async/map.js';
import { returnResult } from 'asyncjs-util';

import { getCurrentPrice } from './get_current_price.js';
import { getCoingeckoRates } from '../coingecko/get_coingecko_rates.js';

const currency = 'BTC';
const defaultFiat = 'USD';
const {isArray} = Array;
const uniq = arr => Array.from(new Set(arr));

/** Get exchange rates from a rate provider

  {
    from: <From Rate Provider String>
    request: <Request Function> {url}, (err, {statusCode}, body) => {}
    symbols: [<Fiat Symbol String>] // empty defaults to USD
  }

  @returns via cbk or Promise
  {
    tickers: [{
      date: <Rate Updated At ISO 8601 Date String>
      rate: <Exchange Rate in Cents Number>
      ticker: <Ticker Symbol String>
    }]
  }
*/
const getPrices = ({from, request, symbols}, cbk) => {
  return new Promise((resolve, reject) => {
    asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!from) {
          return cbk([400, 'ExpectedFromRateProviderToGetPriceRates']);
        }

        if (!request) {
          return cbk([400, 'ExpectedRequestFunctionToGetExchangeRates']);
        }

        if (!isArray(symbols)) {
          return cbk([400, 'ExpectedSymbolsToGetFiatExchangeRates']);
        }

        return cbk();
      },

      // Symbols to get
      priceSymbols: ['validate', ({}, cbk) => {
        const prices = [];

        for (const n of symbols) {
          prices.push(n)
        }

        if (symbols.length === 0) {
          prices.push(defaultFiat);
        }

        return cbk(null, uniq(prices));
      }],

      // Batch fetch prices
      getBatchPrices: ['priceSymbols', ({priceSymbols}, cbk) => {
        // Exit early when batch rate lookups are supported
        if (from !== 'coingecko') {
          return cbk();
        }

        return getCoingeckoRates({request, symbols: priceSymbols}, cbk);
      }],

      // Fetch all the prices
      getPrices: ['priceSymbols', ({priceSymbols}, cbk) => {
        // Exit early when batch rate lookups are supported
        if (from === 'coingecko') {
          return cbk();
        }

        return asyncMap(priceSymbols, (fiat, cbk) => {
          return getCurrentPrice({
            currency,
            fiat,
            from,
            request,
          },
          (err, res) => {
            if (err) {
              return cbk(err);
            }

            return cbk(null, {date: res.date, rate: res.cents, ticker: fiat});
          });
        },
        cbk);
      }],

      // Final set of prices
      prices: [
        'getBatchPrices',
        'getPrices',
        ({getBatchPrices, getPrices}, cbk) =>
      {
        // Exit early when price fetching was batched
        if (getBatchPrices) {
          return cbk(null, getBatchPrices);
        }

        return cbk(null, {tickers: getPrices});
      }],
    },
    returnResult({reject, resolve, of: 'prices'}, cbk));
  });
};

export { getPrices }
