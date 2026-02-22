import  { deepStrictEqual, rejects} from 'node:assert/strict';
import test from 'node:test';

import method from './../../rates/get_current_price.js';

const makeRequest = (err, r, body) => ({}, cbk) => cbk(err, r, body);
const updatedISO = '2020-01-13T20:13:00+00:00';

const makeArgs = override => {
  const args = {
    currency: 'BTC',
    fiat: 'USD',
    from: 'coindesk',
    request: makeRequest(
      null,
      {statusCode: 200},
      {bpi: {USD: {rate_float: 1}}, time: {updatedISO: updatedISO}},
    )
  };

  for (const key of Object.keys(override)) {
    args[key] = override[key]
  }

  return args;
};

const tests = [
  {
    args: makeArgs({currency: undefined}),
    description: 'Currency is required',
    error: [400, 'ExpectedCurrencyToGetCurrentPriceFor'],
  },
  {
    args: makeArgs({fiat: undefined}),
    description: 'Fiat is required',
    error: [400, 'ExpectedFiatSymbolToGetCurrentPriceIn'],
  },
  {
    args: makeArgs({from: undefined}),
    description: 'From is required',
    error: [400, 'ExpectedRateProviderToGetCurrentPrice'],
  },
  {
    args: makeArgs({from: 'unknown'}),
    description: 'A known provider is required',
    error: [400, 'UnknownRateProviderToGetCurrentFiatPrice'],
  },
  {
    args: makeArgs({request: undefined}),
    description: 'Request is required',
    error: [400, 'ExpectedRequestFunctionToGetCurrentPrice'],
  },
  {
    args: makeArgs({}),
    description: 'Rate is returned',
    expected: {cents: 100},
  },
];

for (const { args, description, error, expected } of tests) {
  test(description, async () => {
    if (error) {
      await rejects(method(args), error, 'Got expected error');

      return;
    }

    const { cents } = await method(args);

    deepStrictEqual(cents, expected.cents, 'Got expected exchange rate');
  })
}
