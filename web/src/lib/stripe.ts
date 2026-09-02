import "server-only";
import Stripe from "stripe";

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurada.");
  if (!cached) cached = new Stripe(key);
  return cached;
}

export const PRECO_CENTIMOS = 9900; // €99
export const PRECO_REVISAO_CENTIMOS = 4900; // €49
export const MOEDA = "eur";
