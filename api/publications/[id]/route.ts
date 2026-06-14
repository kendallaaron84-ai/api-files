// app/api/publications/[id]/route.ts
import { NextResponse } from "next/server";
import * as admin from "firebase-admin";

export const dynamic = "force-dynamic";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}
const db = admin.firestore();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Fetch live validation data straight from your Firebase cloud ledger
    const docRef = db.collection("products").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ message: "Publication profile missing." }, { status: 404 });
    }

    const data = docSnap.data();

    // Map the studio schema into a format that bloom-player.js loops through out-of-the-box
    const chaptersPayload = (data?.studioTracks || []).map((track: any) => ({
      id: track.id,
      title: track.title,
      url: track.securedPlaybackUrl || `https://storage.googleapis.com/koba-ai-processing-vault/audio-sources/${track.fileName}`,
      transcript_file_url: track.transcriptUrl || "" // Bound tightly for your European Accessibility Act highlights
    }));

    // Output formatting matching koba-i-audio.php expectations
    return NextResponse.json({
      id: docSnap.id,
      title: data?.title || "Sovereign Audio Delivery",
      authorName: data?.authorName || "Unknown Author",
      coverArtUrl: data?.coverArtUrl || "",
      bgImageUrl: data?.bgImageUrl || "",
      chapters: chaptersPayload
    });

  } catch (error: any) {
    return NextResponse.json({ error: "Secure sync tunnel interrupted." }, { status: 500 });
  }
}