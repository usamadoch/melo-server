import { describe, it, expect } from 'vitest';
import { normalize, addVectors, scaleVector, cosineSimilarity } from '../embeddingService.js';

describe('Embedding Math Pure Functions', () => {
  describe('normalize', () => {
    it('normalizes a vector to unit length', () => {
      // 3-4-5 triangle: magnitude is 5.
      const vec = [3, 4];
      const normalized = normalize(vec);
      expect(normalized[0]).toBeCloseTo(0.6);
      expect(normalized[1]).toBeCloseTo(0.8);
    });

    it('returns the same vector if magnitude is zero', () => {
      const vec = [0, 0, 0];
      const normalized = normalize(vec);
      expect(normalized).toEqual([0, 0, 0]);
    });
  });

  describe('addVectors', () => {
    it('adds two vectors of the same length', () => {
      const a = [1, 2, 3];
      const b = [4, 5, 6];
      expect(addVectors(a, b)).toEqual([5, 7, 9]);
    });

    it('pads the shorter vector with zeros', () => {
      const a = [1, 2];
      const b = [3, 4, 5];
      expect(addVectors(a, b)).toEqual([4, 6, 5]);
      expect(addVectors(b, a)).toEqual([4, 6, 5]);
    });
  });

  describe('scaleVector', () => {
    it('scales all components of a vector by a scalar', () => {
      const vec = [1, -2, 3];
      expect(scaleVector(vec, 1.5)).toEqual([1.5, -3, 4.5]);
    });
  });

  describe('cosineSimilarity', () => {
    it('returns 1 for identical normalized vectors', () => {
      const a = normalize([1, 1, 1]);
      const b = normalize([1, 1, 1]);
      expect(cosineSimilarity(a, b)).toBeCloseTo(1);
    });

    it('returns 0 for orthogonal vectors', () => {
      const a = [1, 0];
      const b = [0, 1];
      expect(cosineSimilarity(a, b)).toBeCloseTo(0);
    });

    it('clamps negative similarities to 0', () => {
      const a = normalize([1, 1]);
      const b = normalize([-1, -1]);
      // Theoretically the dot product is -1, but our function clamps to [0, 1]
      expect(cosineSimilarity(a, b)).toBe(0);
    });

    it('returns 0 if one or both vectors are empty', () => {
      expect(cosineSimilarity([], [1, 2])).toBe(0);
      expect(cosineSimilarity([1, 2], [])).toBe(0);
      expect(cosineSimilarity([], [])).toBe(0);
    });
  });
});
