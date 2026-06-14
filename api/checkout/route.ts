import { NextResponse } from "next/server";
import Stripe from "stripe";
import * as admin from "firebase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { 
  apiVersion: "2023-10-16" 
});

const db = admin.apps.length ? admin.firestore() : null;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("🔥 INCOMING JUBILEE PAYLOAD:", body);
    
    const { 
      assetId,
      title,
      price,
      product_type, 
      stripeConnectId, 
      user_email, 
      origin_domain 
    } = body;

    if (!user_email) {
      return NextResponse.json({ success: false, message: "Reader email is required for entitlement assignment." }, { status: 400 });
    }

    // -------------------------------------------------------------------------
    // RULE 1: HUMAN-CENTRIC CODES FOR FREE tiers ($0.00 Short Stories)
    // -------------------------------------------------------------------------
    const parsedPrice = parseFloat(String(price).replace(/[^0-9.]/g, "")) || 0;
    
    if (parsedPrice === 0 && db) {
      console.log(`🎁 Processing Free Entitlement for ${user_email} -> ${assetId}`);
      
      // Auto-provision access key to Firestore without hitting Stripe
      const entitlementId = `${user_email.replace(/[^a-zA-Z0-9]/g, "_")}_${assetId}`;
      await db.collection("entitlements").doc(entitlementId).set({
        userEmail: user_email,
        assetKey: assetId,
        productType: product_type || "Audiobook",
        grantedAt: admin.firestore.FieldValue.serverTimestamp(),
        originDomain: origin_domain || "koba-dev.local",
        status: "active"
      });

      // Tell the frontend to refresh instantly because they now own it
      return NextResponse.json({ success: true, isFreeUnlock: true, url: "/refresh" });
    }

    // -------------------------------------------------------------------------
    // RULE 2: PREMIUM STRIPE ENGINE (Standalone Books & SaaS Memberships)
    // -------------------------------------------------------------------------
    const sessionMode = product_type === "Membership" ? "subscription" : "payment";

    // Dynamic line items: You can use standard price inline configurations
    const sessionOptions: Stripe.Checkout.SessionCreateParams = {
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: title || "Jubilee Premium Publication",
            metadata: { assetId: assetId }
          },
          unit_amount: Math.round(parsedPrice * 100), // Stripe expects amounts in cents
          ...(sessionMode === "subscription" && {
            recurring: { interval: "month" }
          })
        },
        quantity: 1
      }],
      mode: sessionMode,
      success_url: `http://${origin_domain || 'localhost:3000'}/bookshelf?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://${origin_domain || 'localhost:3000'}/bookshelf`,
      metadata: {
        koba_asset_key: assetId,
        koba_product_type: product_type || "Audiobook",
        author_stripe_connect_id: stripeConnectId || "",
        user_email: user_email, 
        origin_domain: origin_domain || "koba-dev.local", 
      },
    };

    // Rule 3: Split Payouts Infrastructure for Sharon Meeks & your mother
    if (stripeConnectId && stripeConnectId.startsWith("acct_")) {
      sessionOptions.payment_intent_data = {
        application_fee_amount: Math.round(parsedPrice * 100 * 0.15), // Your 15% platform infrastructure fee
        transfer_data: { destination: stripeConnectId },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionOptions);
    return NextResponse.json({ success: true, url: session.url });

  } catch (error: any) {
    console.error("❌ Real Backend Stripe Error:", error.message);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}