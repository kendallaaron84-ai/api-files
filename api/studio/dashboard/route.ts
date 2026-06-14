// app/api/studio/dashboard/route.ts
import { NextResponse } from "next/server";
import * as admin from "firebase-admin";

export const dynamic = "force-dynamic";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}
const db = admin.firestore();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get("assetId");

    if (!assetId) {
      return NextResponse.json({ success: false, message: "Asset parameter required." }, { status: 400 });
    }

    const productDoc = await db.collection("products").doc(assetId).get();

    if (!productDoc.exists) {
      return NextResponse.json({ success: false, message: "Asset workspace not found." }, { status: 404 });
    }

    const data = productDoc.data();

    // Structural sanitization payload mapping
    // app/api/studio/dashboard/route.ts

  // ... look for your return payload structure around line 35:
  return NextResponse.json({
    success: true,
    data: {
      id: productDoc.id,
      title: data?.title || "Untitled Production Portfolio",
      authorName: data?.authorName || "Independent Author",
      vaultStatus: data?.vaultStatus || "unprotected",
      mediaType: data?.mediaType || "audio",
      // FIXED: Safely check if data exists first before reading arrays
      chaptersCount: data && data.chapters ? data.chapters.length : 0,
      tracksCount: data && data.studioTracks ? data.studioTracks.length : 0,
      studioTracks: data?.studioTracks || [],
      guardrails: data?.guardrails || { setting: "", mood: "", loreContext: "" },
      updatedAt: data?.lastLockedAt ? data.lastLockedAt.toDate().toISOString() : new Date().toISOString()
    }
  });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}