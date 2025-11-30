import { Schema, model } from "mongoose";

const customerSchema = new Schema({
  loginId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  name: String,
  address: String,
//   orders: [{ type: Schema.Types.ObjectId, ref: "Order" }],
});

export default model("Customer", customerSchema);
