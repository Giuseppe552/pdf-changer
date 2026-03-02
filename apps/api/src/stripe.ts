import Stripe from "stripe";
import type { Env } from "./env";
import { getUserById, upsertUserStripe } from "./db";

export function stripeClient(env: Env): Stripe | null {
  if (!env.STRIPE_SECRET_KEY) return null;
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export async function handleStripeWebhook(
  env: Env,
  db: D1Database,
  stripe: Stripe,
  req: Request,
): Promise<Response> {
  const sig = req.headers.get("stripe-signature");
  if (!sig || !env.STRIPE_WEBHOOK_SECRET) return new Response("Bad signature", { status: 400 });

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return new Response("Bad signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id || (session.metadata?.user_id as string | undefined);
    if (userId && session.customer && session.subscription) {
      const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer.id;

      // Validate the user exists and has no conflicting Stripe customer
      const user = await getUserById(db, userId);
      if (user && !(user.stripe_customer_id && user.stripe_customer_id !== customerId)) {
        let paidUntilMs: number | null = null;
        try {
          const sub = await stripe.subscriptions.retrieve(subId);
          paidUntilMs = sub.current_period_end ? sub.current_period_end * 1000 : null;
        } catch {
          // Don't assume payment succeeded — leave null so the user stays on
          // their current plan until the next webhook delivers real data.
          paidUntilMs = null;
        }
        await upsertUserStripe(db, userId, {
          plan: "paid",
          paid_until_ms: paidUntilMs,
          stripe_customer_id: customerId,
          stripe_subscription_id: subId,
        });
      }
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    const subId = sub.id;
    const paidUntilMs = sub.current_period_end ? sub.current_period_end * 1000 : null;
    const plan = event.type === "customer.subscription.deleted" ? "free" : "paid";

    // Best-effort: update by stripe_customer_id first, fallback to stripe_subscription_id.
    const byCustomer = await db
      .prepare("SELECT id FROM users WHERE stripe_customer_id = ?1 LIMIT 1")
      .bind(customerId)
      .first<{ id: string }>();
    const userId = byCustomer?.id
      ? byCustomer.id
      : (
          await db
            .prepare("SELECT id FROM users WHERE stripe_subscription_id = ?1 LIMIT 1")
            .bind(subId)
            .first<{ id: string }>()
        )?.id;
    if (userId) {
      await upsertUserStripe(db, userId, {
        plan,
        paid_until_ms: plan === "paid" ? paidUntilMs : null,
        stripe_customer_id: customerId,
        stripe_subscription_id: subId,
      });
    }
  }

  return new Response("ok", { status: 200 });
}

