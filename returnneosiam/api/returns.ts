import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // ใช้ path เดียวกับฝั่งแอป (DataContext.tsx ใช้ 'return_records')
    const firebaseUrl = "https://returnneosiam-default-rtdb.asia-southeast1.firebasedatabase.app/return_records.json";
    const authToken = process.env.FIREBASE_DATABASE_SECRET;

    const url = authToken ? `${firebaseUrl}?auth=${authToken}` : firebaseUrl;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Firebase error: ${response.status}`);
    }

    const data = await response.json();

    // แปลง object เป็น array
    const records = data ? Object.entries(data).map(([id, record]: [string, Record<string, unknown>]) => ({
      id,
      ...record
    })) : [];

    res.status(200).json(records);
  } catch (error) {
    console.error("Error fetching return records", error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
}
