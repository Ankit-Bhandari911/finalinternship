import axios from "axios";
import config from "../config/config.js";

const payViaKhalti = async (data) => {
  if (!data) throw { message: "Payment data is required." };

  if (!data.amount) throw { message: "Payment amount is required." };

  if (!data.purchaseOrderId)
    throw { message: "Purchase order id is required." };

  if (!data.purchaseOrderName)
    throw { message: "Purchase order name is required." };

  const body = {
    return_url: `${config.appUrl}/orders/${data.purchaseOrderId}/payment/khalti`,
    // Khalti expects the amount in paisa (1 NPR = 100 paisa).
    amount: Math.round(data.amount * 100),
    website_url: config.appUrl,
    purchase_order_id: data.purchaseOrderId,
    purchase_order_name: data.purchaseOrderName,
    customer_info: {
      name: data.customer.name,
      email: data.customer.email,
      phone: data.customer.phone,
    },
  };

  const response = await axios.post(
    `${config.khalti.apiUrl}/epayment/initiate/`,
    body,
    {
      headers: {
        Authorization: `Key ${config.khalti.apiKey}`,
      },
    }
  );

  return response.data;
};

const lookupKhalti = async (pidx) => {
  const response = await axios.post(
    `${config.khalti.apiUrl}/epayment/lookup/`,
    { pidx },
    {
      headers: {
        Authorization: `Key ${config.khalti.apiKey}`,
      },
    }
  );

  return response.data;
};

export default { lookupKhalti, payViaKhalti };
