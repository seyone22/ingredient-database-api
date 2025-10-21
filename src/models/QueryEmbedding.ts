import {Document, model, Model, models, Schema} from "mongoose";

export interface IQueryEmbeddingData {
    query: string;
    embedding: number[];
    createdAt: Date;
}

export interface IQueryEmbedding extends IQueryEmbeddingData, Document {
}

const queryEmbeddingSchema = new Schema<IQueryEmbedding>(
    {
        query: {type: String, required: true, unique: true},
        embedding: {type: [Number], required: true},
    },
    {timestamps: true}
);

export const QueryEmbedding: Model<IQueryEmbedding> = models?.QueryEmbedding || model<IQueryEmbedding>("QueryEmbedding", queryEmbeddingSchema);

export default QueryEmbedding;