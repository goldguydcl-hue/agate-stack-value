import { Hono } from 'hono';
import { context, reddit } from '@devvit/web/server';
import type {
  PricesResponse,
  ShareRequest,
  ShareResponse,
} from '../../shared/api';
import { formatUsd } from '../../shared/metals';
import { getModeratorPrices, getPrices } from '../prices';

type ErrorResponse = {
  status: 'error';
  message: string;
};

export const api = new Hono();

api.get('/prices', async (c) => {
  try {
    const result = await getPrices();
    return c.json<PricesResponse>({
      type: 'prices',
      prices: result.prices,
      fetchedAt: result.fetchedAt,
      cacheHit: result.cacheHit,
    });
  } catch (error) {
    console.error('API prices error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Failed to load prices' },
      500
    );
  }
});

api.get('/moderator-prices', async (c) => {
  try {
    const prices = await getModeratorPrices();
    return c.json({ type: 'moderator-prices', prices });
  } catch (error) {
    console.error('API moderator-prices error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Failed to load reference prices' },
      500
    );
  }
});

api.post('/share', async (c) => {
  try {
    const body = await c.req.json<ShareRequest>();
    const total = Number.isFinite(body.totalValue) ? body.totalValue : 0;
    const dealer = Number.isFinite(body.dealerValue) ? body.dealerValue : 0;
    const title =
      `My stack is worth about ${formatUsd(total)} ` +
      `(${formatUsd(dealer)} dealer value) — ${body.pricedLines} of ${body.lineCount} lines priced`;

    const post = await reddit.submitCustomPost({ title });
    return c.json<ShareResponse>({
      type: 'share',
      postId: post.id,
      url: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error('API share error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Failed to share result' },
      500
    );
  }
});
