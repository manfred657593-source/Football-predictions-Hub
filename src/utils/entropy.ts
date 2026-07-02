export interface EntropyMetrics {
  shannonEntropyNats: number; // Shannon Entropy in nats (base e)
  shannonEntropyBits: number; // Shannon Entropy in bits (base 2)
  maxEntropyNats: number; // Maximum possible entropy ln(N)
  normalizedEntropy: number; // H / H_max in [0, 1]
  confidenceScore: number; // (1 - normalizedEntropy) * 100 in [0, 100]
  confidenceTier: 'LOW' | 'MODERATE' | 'STRONG' | 'HIGH_CONVICTION';
  confidenceColor: string;
  confidenceLabel: string;
  numOutcomes: number;
}

/**
 * Computes Shannon Entropy and Engine Confidence for any probability array
 * @param probabilities Array of non-negative probabilities summing to ~1.0
 */
export function calculateEntropyAndConfidence(probabilities: number[]): EntropyMetrics {
  const validProbs = probabilities.map((p) => Math.max(0, p));
  const total = validProbs.reduce((a, b) => a + b, 0);
  const normalizedProbs = total > 0 ? validProbs.map((p) => p / total) : validProbs.map(() => 1 / validProbs.length);

  const N = normalizedProbs.length;
  if (N <= 1) {
    return {
      shannonEntropyNats: 0,
      shannonEntropyBits: 0,
      maxEntropyNats: 1,
      normalizedEntropy: 0,
      confidenceScore: 100,
      confidenceTier: 'HIGH_CONVICTION',
      confidenceColor: '#10b981',
      confidenceLabel: 'Maximum Certainty',
      numOutcomes: N,
    };
  }

  // Shannon entropy H(P) = -sum(p_i * ln(p_i))
  let hNats = 0;
  for (const p of normalizedProbs) {
    if (p > 1e-12) {
      hNats -= p * Math.log(p);
    }
  }

  const hBits = hNats / Math.LN2;
  const maxNats = Math.log(N);
  const normEntropy = Math.min(1, Math.max(0, hNats / maxNats));
  const confidenceScore = Number(((1 - normEntropy) * 100).toFixed(1));

  let confidenceTier: 'LOW' | 'MODERATE' | 'STRONG' | 'HIGH_CONVICTION';
  let confidenceColor = '#ef4444';
  let confidenceLabel = 'Uncertain / High Entropy';

  if (confidenceScore >= 60) {
    confidenceTier = 'HIGH_CONVICTION';
    confidenceColor = '#10b981'; // emerald
    confidenceLabel = 'High Engine Conviction';
  } else if (confidenceScore >= 40) {
    confidenceTier = 'STRONG';
    confidenceColor = '#06b6d4'; // cyan
    confidenceLabel = 'Clear Probability Edge';
  } else if (confidenceScore >= 20) {
    confidenceTier = 'MODERATE';
    confidenceColor = '#f59e0b'; // amber
    confidenceLabel = 'Moderate Dispersion';
  } else {
    confidenceTier = 'LOW';
    confidenceColor = '#f43f5e'; // rose/red
    confidenceLabel = 'High Volatility / Low Confidence';
  }

  return {
    shannonEntropyNats: Number(hNats.toFixed(4)),
    shannonEntropyBits: Number(hBits.toFixed(4)),
    maxEntropyNats: Number(maxNats.toFixed(4)),
    normalizedEntropy: Number(normEntropy.toFixed(4)),
    confidenceScore,
    confidenceTier,
    confidenceColor,
    confidenceLabel,
    numOutcomes: N,
  };
}
