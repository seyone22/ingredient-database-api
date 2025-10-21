import mongoose from "mongoose";

const queryEmbeddingSchema = new mongoose.Schema({
    query: { type: String, required: true, unique: true },
    embedding: { type: [Number], required: true },
    createdAt: { type: Date, default: Date.now }
});

export const QueryEmbedding = mongoose.model("QueryEmbedding", queryEmbeddingSchema);
