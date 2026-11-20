import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { lineValue, stackTotals } from './stack.ts';
import type { HoldingLineValue } from './stack.ts';

// Hand-computed test stack (see BUILD-REPORT.md):
//   gold $4,000/oz, silver $50/oz, platinum $1,500/oz.
//   L1: 2 troy oz gold, 99.9%, qty 1  -> 4000 x 2 x 0.999 = $7,992.00
//   L2: 100 g silver, 99.9%, qty 3    -> 50 x (100 / 31.1034768) x 0.999
//                                      = $160.592979... each, $481.778937... x3
//   L3: 1 troy oz platinum, 95%, qty 2 -> 1500 x 1 x 0.95 x 2 = $2,850.00
//   Total $11,323.778937..., dealer (95%) $10,757.589990...
describe('stack math', () => {
  it('values a mixed-metal, mixed-unit, mixed-quantity stack', () => {
    const l1 = lineValue(
      {
        id: 1,
        metal: 'gold',
        weight: 2,
        unit: 'oz',
        purity: 99.9,
        quantity: 1,
      },
      4000
    );
    const l2 = lineValue(
      {
        id: 2,
        metal: 'silver',
        weight: 100,
        unit: 'g',
        purity: 99.9,
        quantity: 3,
      },
      50
    );
    const l3 = lineValue(
      {
        id: 3,
        metal: 'platinum',
        weight: 1,
        unit: 'oz',
        purity: 95,
        quantity: 2,
      },
      1500
    );
    assert.ok(l1 !== null && Math.abs(l1 - 7992) < 0.000001);
    assert.ok(l2 !== null && Math.abs(l2 - 481.7789373308903) < 0.000001);
    assert.ok(l3 !== null && Math.abs(l3 - 2850) < 0.000001);

    const values: HoldingLineValue[] = [
      {
        line: {
          id: 1,
          metal: 'gold',
          weight: 2,
          unit: 'oz',
          purity: 99.9,
          quantity: 1,
        },
        value: l1,
      },
      {
        line: {
          id: 2,
          metal: 'silver',
          weight: 100,
          unit: 'g',
          purity: 99.9,
          quantity: 3,
        },
        value: l2,
      },
      {
        line: {
          id: 3,
          metal: 'platinum',
          weight: 1,
          unit: 'oz',
          purity: 95,
          quantity: 2,
        },
        value: l3,
      },
    ];
    const totals = stackTotals(values);
    assert.ok(Math.abs(totals.totalValue - 11323.77893733089) < 0.000001);
    assert.ok(
      Math.abs(totals.totalDealerValue - 10757.589990464346) < 0.000001
    );
    assert.equal(totals.pricedLines, 3);
    assert.equal(totals.unpricedLines, 0);
  });

  it('returns null for a line with no price and excludes it from the total', () => {
    const rh = lineValue(
      {
        id: 4,
        metal: 'rhodium',
        weight: 1,
        unit: 'oz',
        purity: 99.9,
        quantity: 1,
      },
      null
    );
    assert.equal(rh, null);
    const totals = stackTotals([
      {
        line: {
          id: 4,
          metal: 'rhodium',
          weight: 1,
          unit: 'oz',
          purity: 99.9,
          quantity: 1,
        },
        value: rh,
      },
    ]);
    assert.equal(totals.totalValue, 0);
    assert.equal(totals.totalDealerValue, 0);
    assert.equal(totals.unpricedLines, 1);
  });
});
