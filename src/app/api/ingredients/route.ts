import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/utils/dbConnect";
import { Ingredient } from "@/models/Ingredient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    await dbConnect();

    const { name } = req.query;

    if (req.method === "GET") {
        try {
            const ingredient = await Ingredient.findOne({ name: name as string });
            if (!ingredient) return res.status(404).json({ error: "Ingredient not found" });
            return res.status(200).json(ingredient);
        } catch (err) {
            return res.status(500).json({ error: "Server error", details: err });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}
