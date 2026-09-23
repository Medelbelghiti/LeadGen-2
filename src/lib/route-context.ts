import type Stripe from "stripe";

export interface ParamsContext<T = Record<string, string>> {
  params: T;
}

export function getParams<T extends Record<string, string>>(ctx: unknown): T {
  return (ctx as ParamsContext<T>).params;
}

export type StripeEvent = Stripe.Event;
