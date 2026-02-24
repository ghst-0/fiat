import { deepStrictEqual, rejects } from 'node:assert/strict';
import test from 'node:test';

import { getCoindeskCurrentPrice } from '../../coindesk/get_coindesk_current_price.js';

const makeRequest = (err, r, body) => ({}, cbk) => cbk(err, r, body);
const updatedISO = '2020-01-13T20:13:00+00:00';

const makeArgs = override => {
  const args = {
    currency: 'BTC',
    fiat: 'USD',
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
    error: [400, 'UnsupportedCurrencyForCoindeskFiatRateLookup'],
  },
  {
    args: makeArgs({fiat: undefined}),
    description: 'Fiat is required',
    error: [400, 'UnsupportedFiatTypeForCoindeskFiatRateLookup'],
  },
  {
    args: makeArgs({request: undefined}),
    description: 'Request is required',
    error: [400, 'ExpectedRequestMethodForCoindeskFiatRateLookup'],
  },
  {
    args: makeArgs({request: makeRequest('err')}),
    description: 'Request errors are passed back',
    error: [503, 'UnexpectedErrorGettingCoindeskPrice', {err: 'err'}],
  },
  {
    args: makeArgs({request: makeRequest()}),
    description: 'Request response is expected',
    error: [503, 'UnexpectedResponseInCoindeskRateResponse'],
  },
  {
    args: makeArgs({request: makeRequest(null, null, {})}),
    description: 'Request response bpi is expected',
    error: [503, 'UnexpectedResponseInCoindeskRateResponse'],
  },
  {
    args: makeArgs({request: makeRequest(null, null, {bpi: {}})}),
    description: 'Request response bpi is expected',
    error: [503, 'UnexpectedResponseInCoindeskRateResponse'],
  },
  {
    args: makeArgs({request: makeRequest(null, null, {bpi: {USD: {}}})}),
    description: 'Request response bpi rate float is expected',
    error: [503, 'ExpectedRateForFiatInCoindeskRateResponse'],
  },
  {
    args: makeArgs({
      request: makeRequest(null, null, {bpi: {USD: {rate_float: 1}}}),
    }),
    description: 'Request response bpi rate float is expected',
    error: [503, 'ExpectedUpdatedTimeInCoindeskRateResponse'],
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
      await rejects(getCoindeskCurrentPrice(args), error, 'Got error');

      return;
    }

    const { cents } = await getCoindeskCurrentPrice(args);

    deepStrictEqual(cents, expected.cents, 'Got expected exchange rate');
  })
}
