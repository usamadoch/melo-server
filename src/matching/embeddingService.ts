import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';

const EMBEDDING_MODEL = 'gemini-embedding-001';

// Weights from the algorithm spec
const CATEGORY_WEIGHT = 1.0;
const SUBCATEGORY_WEIGHT = 1.5;
const FREE_TEXT_WEIGHT = 2.0;

let genaiClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!genaiClient) {
    if (!env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    genaiClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return genaiClient;
}

/**
 * Get an embedding vector for a single text string from the Gemini API.
 */
async function getEmbedding(text: string): Promise<number[]> {
  const ai = getClient();
  const result = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: [{ role: 'user', parts: [{ text }] }],
  });
  const values = result.embeddings?.[0]?.values;
  return values ?? [];
}

/**
 * Normalize a vector to unit length (L2 norm).
 */
export function normalize(vec: number[]): number[] {
  const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (magnitude === 0) return vec;
  return vec.map((v) => v / magnitude);
}

/**
 * Add two vectors element-wise. If lengths differ, pads the shorter one with zeros.
 */
export function addVectors(a: number[], b: number[]): number[] {
  const len = Math.max(a.length, b.length);
  const result = new Array(len).fill(0);
  for (let i = 0; i < len; i++) {
    result[i] = (a[i] || 0) + (b[i] || 0);
  }
  return result;
}

/**
 * Scale a vector by a scalar.
 */
export function scaleVector(vec: number[], scalar: number): number[] {
  return vec.map((v) => v * scalar);
}

/**
 * Build a user's interest vector from their categories, subcategories, and optional free text.
 *
 * Formula from the algorithm spec:
 *   user_vector = normalize(
 *     Σ (category_embedding_i  * 1.0)
 *   + Σ (subcategory_embedding_j * 1.5)
 *   + (free_text_embedding * 2.0)  if provided
 *   )
 */
export async function buildUserVector(
  categories: string[],
  subcategories: string[],
  freeTextInterest?: string
): Promise<number[]> {
  // Collect all texts to embed and their weights
  const embedTasks: { text: string; weight: number }[] = [];

  for (const cat of categories) {
    embedTasks.push({ text: cat, weight: CATEGORY_WEIGHT });
  }
  for (const sub of subcategories) {
    embedTasks.push({ text: sub, weight: SUBCATEGORY_WEIGHT });
  }
  if (freeTextInterest && freeTextInterest.trim().length > 0) {
    embedTasks.push({ text: freeTextInterest.trim(), weight: FREE_TEXT_WEIGHT });
  }

  if (embedTasks.length === 0) {
    return [];
  }

  // Fetch all embeddings in parallel
  const embeddings: number[][] = await Promise.all(
    embedTasks.map(async (task) => {
      const vec = await getEmbedding(task.text);
      return scaleVector(vec, task.weight);
    })
  );

  if (embeddings.length === 0) {
    return [];
  }

  // Weighted sum
  let combined: number[] = embeddings[0]!;
  for (let i = 1; i < embeddings.length; i++) {
    combined = addVectors(combined, embeddings[i]!);
  }

  // Normalize to unit vector
  return normalize(combined);
}

/**
 * Cosine similarity between two normalized vectors.
 * Since they are already normalized, this is just the dot product.
 * Returns a value between -1 and 1 (practically 0 to 1 for interest vectors).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const len = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i]! * b[i]!;
  }
  // Clamp to [0, 1] since negative similarity is meaningless for matching
  return Math.max(0, Math.min(1, dot));
}
