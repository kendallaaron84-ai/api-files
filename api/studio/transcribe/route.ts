// app/api/studio/transcribe/route.ts
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(request: Request) {
  try {
    const { trackId, assetId } = await request.json();

    // 🔑 Use the server-side environment variable
    const apiKey = process.env.AIzaSyAJIU1I8xOoMMSxBkVb4XXTV3QDc1iQs5k; 
    
    if (!apiKey) {
      return NextResponse.json({ success: false, message: "Server-side API Key not configured." }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    // ... rest of your transcription logic ...
    
    return NextResponse.json({ success: true, /* ... data ... */ });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}