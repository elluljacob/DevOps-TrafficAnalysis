import mongoose, { Schema, Document } from "mongoose";

export interface ITrafficStat extends Document {
  label: string;
  value: number;
  timestamp: Date;
}

const TrafficStatSchema = new Schema<ITrafficStat>({
  label: { type: String, required: true },
  value: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
});

// Prevent model overwrite on compile
export const TrafficStatModel = 
  mongoose.models.TrafficStat || 
  mongoose.model<ITrafficStat>("TrafficStat", TrafficStatSchema);