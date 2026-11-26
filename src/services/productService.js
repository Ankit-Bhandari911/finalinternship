import { PRODUCT_DESCRIPTION_PROMPT } from "../constants/prompt.js";
import { ADMIN } from "../constants/roles.js";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import uploadFile from "../utils/file.js";
import promptGemini from "../utils/gemini.js";

const EDITABLE_FIELDS = [
  "name",
  "brand",
  "category",
  "price",
  "stock",
  "description",
];

// Only these fields may be set from a request body (blocks overwriting
// createdBy, createdAt, imageUrls, etc.).
const pickProductFields = (data = {}) =>
  Object.fromEntries(
    EDITABLE_FIELDS.filter((field) => data[field] !== undefined).map(
      (field) => [field, data[field]]
    )
  );

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const createProduct = async (data, files, createdBy) => {
  const uploadedFiles = await uploadFile(files);

  const promptMessage = PRODUCT_DESCRIPTION_PROMPT.replace("%s", data.name)
    .replace("%s", data.brand || "")
    .replace("%s", data.category);

  let description = data.description?.trim();

  if (!description) {
    try {
      description = await promptGemini(promptMessage);
    } catch (error) {
      console.error(
        "Gemini description failed:",
        error.response?.status || error.message
      );
      description = "";
    }
  }

  const createdProduct = await Product.create({
    ...pickProductFields(data),
    createdBy,
    imageUrls: uploadedFiles.map((item) => item?.url),
    description,
  });

  return createdProduct;
};

const deleteProduct = async (id, user) => {
  const product = await getProductById(id);

  if (String(product.createdBy) !== String(user._id) && !user.roles.includes(ADMIN)) {
    throw {
      statusCode: 403,
      message: "Access denied.",
    };
  }

  await Product.findByIdAndDelete(id);
};

const getProductById = async (id) => {
  const product = mongoose.isValidObjectId(id)
    ? await Product.findById(id)
    : null;

  if (!product) {
    throw {
      statusCode: 404,
      message: "Product not found.",
    };
  }

  return product;
};

const getProducts = async (query) => {
  const { brands, category, min, max, limit, name, offset, createdBy } = query;

  let sort = {};
  try {
    sort = JSON.parse(query.sort || "{}");
  } catch {
    throw { statusCode: 400, message: "Invalid sort parameter." };
  }

  const toNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : undefined;
  };

  const filters = {};

  if (brands) filters.brand = { $in: brands.split(",") };
  if (category) filters.category = category;
  if (toNumber(min) !== undefined) filters.price = { $gte: toNumber(min) };
  if (toNumber(max) !== undefined) {
    filters.price = { ...filters.price, $lte: toNumber(max) };
  }
  if (name) filters.name = { $regex: escapeRegex(name), $options: "i" };

  if (createdBy) {
    if (!mongoose.isValidObjectId(createdBy)) {
      throw { statusCode: 400, message: "Invalid createdBy parameter." };
    }
    filters.createdBy = createdBy;
  }

  const products = await Product.find(filters)
    .sort(sort)
    .limit(toNumber(limit) || 0)
    .skip(toNumber(offset) || 0);

  return products;
};

const updateProduct = async (id, data, files, user) => {
  const product = await getProductById(id);

  if (String(product.createdBy) !== String(user._id) && !user.roles.includes(ADMIN)) {
    throw {
      statusCode: 403,
      message: "Access denied.",
    };
  }

  const updateData = pickProductFields(data);

  if (files && files.length > 0) {
    const uploadedFiles = await uploadFile(files);
    updateData.imageUrls = uploadedFiles.map((item) => item?.url);
  }

  const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  return updatedProduct;
};

const getBrands = async () => {
  return await Product.distinct("brand");
};

const getCount = async () => {
  return await Product.countDocuments();
};

const getCategories = async () => {
  return await Product.distinct("category");
};

export default {
  createProduct,
  deleteProduct,
  getBrands,
  getCount,
  getCategories,
  getProductById,
  getProducts,
  updateProduct,
};
