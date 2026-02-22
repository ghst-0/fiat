import { deepStrictEqual, rejects } from 'node:assert/strict';
import test from 'node:test';

import { getCoingeckoRates } from './../../coingecko/index.js';

const body = {rates: {eur: {value: 1}, usd: {value: 2}}};

const makeRequest = (err, res) => ({}, cbk) => cbk(err, null, res);

const makeArgs = override => {
  const args = {request: makeRequest(null, body), symbols: ['EUR']};

  for (const key of Object.keys(override)) {
    args[key] = override[key]
  }

  return args;
};

const tests = [
  {
    args: makeArgs({symbols: undefined}),
    description: 'Symbols are required',
    error: [400, 'ExpectedSymbolsToGetCoingeckoExchangeRates'],
  },
  {
    args: makeArgs({request: undefined}),
    description: 'A request function is required',
    error: [400, 'ExpectedRequestFunctionToGetExchangeRates'],
  },
  {
    args: makeArgs({request: makeRequest('err')}),
    description: 'Request cannot return error',
    error: [503, 'UnexpectedErrorGettingCoingeckoRates', {err: 'err'}],
  },
  {
    args: makeArgs({request: makeRequest(null, null)}),
    description: 'Response must return a body',
    error: [503, 'ExpectedRatesInCoingeckoResponse'],
  },
  {
    args: makeArgs({request: makeRequest(null, {})}),
    description: 'Response must return rates',
    error: [503, 'ExpectedRatesInCoingeckoResponse'],
  },
  {
    args: makeArgs({request: makeRequest(null, {rates: {}})}),
    description: 'Response is expected to have a result',
    error: [404, 'CoingeckoRateLookupSymbolNotFound'],
  },
  {
    args: makeArgs({symbols: []}),
    description: 'Got default exchange rate',
    expected: {
      tickers: [{
        date: '2020-01-13T20:13:00.000Z',
        rate: 200,
        ticker: 'USD',
      }],
    },
  },
  {
    args: makeArgs({}),
    description: 'Got exchange rates',
    expected: {
      tickers: [{
        date: '2020-01-13T20:13:00.000Z',
        rate: 100,
        ticker: 'EUR',
      }],
    },
  },
];

for (const { args, description, error, expected } of tests) {
  test(description, async () => {
    if (error) {
      await rejects(getCoingeckoRates(args), error, 'Got expected error');

      return;
    }

    const [expectedTicker] = expected.tickers;
    const [ticker] = (await getCoingeckoRates(args)).tickers;

    deepStrictEqual(!!ticker.date, true, 'Got ticker date');
    deepStrictEqual(ticker.rate, expectedTicker.rate, 'Got expected rate');
    deepStrictEqual(ticker.ticker, expectedTicker.ticker, 'Got symbol');
  })
}
