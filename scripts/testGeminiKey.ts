import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { GoogleGenAI } from "@google/genai";

async function testGeminiKey() {
  const keysToTest = [
    process.env.GEMINI_API_KEY
  ];

  for (const k of keysToTest) {
    if (!k) continue;
    console.log(`Testing key: ${k.slice(0, 10)}...`);
    try {
      const ai = new GoogleGenAI({ apiKey: k });
      const res = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Hello",
      });
      console.log("✅ Success! Response:", res.text);
      return k;
    } catch (err: any) {
      console.error("❌ Key failed:", err.message);
    }
  }
}

testGeminiKey();
