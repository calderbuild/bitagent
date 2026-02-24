import { describe, it, expect } from "vitest";
import { calculateTrustScore, type TrustInput } from "./score.js";

function makeInput(overrides: Partial<TrustInput> = {}): TrustInput {
  return {
    btcStake: 0n,
    reputationScore: 50,
    feedbackCount: 0,
    slashHistory: 0,
    uptimeDays: 1,
    ...overrides,
  };
}

function btcToWei(btc: number): bigint {
  return BigInt(Math.round(btc * 1e18));
}

describe("calculateTrustScore", () => {
  describe("tier boundaries", () => {
    it("returns 'unverified' for zero-stake zero-rep agent", () => {
      const result = calculateTrustScore(makeInput({ reputationScore: 0 }));
      expect(result.tier).toBe("unverified");
      expect(result.total).toBeLessThan(20);
    });

    it("returns 'bronze' at 20+ total", () => {
      const result = calculateTrustScore(makeInput({
        btcStake: btcToWei(0.000003),
        reputationScore: 40,
      }));
      expect(result.total).toBeGreaterThanOrEqual(20);
      expect(result.tier).toBe("bronze");
    });

    it("returns 'silver' at 40+ total", () => {
      const result = calculateTrustScore(makeInput({
        btcStake: btcToWei(0.000005),
        reputationScore: 60,
        feedbackCount: 5,
        uptimeDays: 3,
      }));
      expect(result.total).toBeGreaterThanOrEqual(40);
      expect(result.tier).toBe("silver");
    });

    it("returns 'gold' at 60+ total", () => {
      const result = calculateTrustScore(makeInput({
        btcStake: btcToWei(0.000008),
        reputationScore: 80,
        feedbackCount: 15,
        uptimeDays: 10,
      }));
      expect(result.total).toBeGreaterThanOrEqual(60);
      expect(result.tier).toBe("gold");
    });

    it("returns 'diamond' at 80+ total", () => {
      const result = calculateTrustScore(makeInput({
        btcStake: btcToWei(0.0001),
        reputationScore: 100,
        feedbackCount: 50,
        uptimeDays: 30,
      }));
      expect(result.total).toBeGreaterThanOrEqual(80);
      expect(result.tier).toBe("diamond");
    });
  });

  describe("demo-scale stakes", () => {
    it("produces meaningful score for 0.000005 BTC (CodeAuditor)", () => {
      const result = calculateTrustScore(makeInput({ btcStake: btcToWei(0.000005) }));
      expect(result.breakdown.stakeScore).toBeGreaterThan(10);
      expect(result.breakdown.stakeScore).toBeLessThan(40);
    });

    it("produces meaningful score for 0.000008 BTC (DataAnalyst)", () => {
      const result = calculateTrustScore(makeInput({ btcStake: btcToWei(0.000008) }));
      expect(result.breakdown.stakeScore).toBeGreaterThan(10);
      expect(result.breakdown.stakeScore).toBeLessThan(40);
    });

    it("DataAnalyst stake score > CodeAuditor stake score", () => {
      const auditor = calculateTrustScore(makeInput({ btcStake: btcToWei(0.000005) }));
      const analyst = calculateTrustScore(makeInput({ btcStake: btcToWei(0.000008) }));
      expect(analyst.breakdown.stakeScore).toBeGreaterThan(auditor.breakdown.stakeScore);
    });

    it("logarithmic curve: doubling stake does not double score", () => {
      const base = calculateTrustScore(makeInput({ btcStake: btcToWei(0.000005) }));
      const doubled = calculateTrustScore(makeInput({ btcStake: btcToWei(0.00001) }));
      const ratio = doubled.breakdown.stakeScore / base.breakdown.stakeScore;
      expect(ratio).toBeLessThan(2);
      expect(ratio).toBeGreaterThan(1);
    });
  });

  describe("weighting", () => {
    it("high stake + low reputation != low stake + high reputation", () => {
      const highStake = calculateTrustScore(makeInput({
        btcStake: btcToWei(0.0001),
        reputationScore: 20,
      }));
      const highRep = calculateTrustScore(makeInput({
        btcStake: btcToWei(0.000001),
        reputationScore: 100,
      }));
      // Both should produce non-trivial scores; BTC weight is 40%, rep is 30%
      expect(highStake.breakdown.stakeScore).toBeGreaterThan(highStake.breakdown.reputationScore);
      expect(highRep.breakdown.reputationScore).toBeGreaterThan(highRep.breakdown.stakeScore);
    });
  });

  describe("slash impact", () => {
    it("no slash gives full stability bonus", () => {
      const result = calculateTrustScore(makeInput({ slashHistory: 0, uptimeDays: 30 }));
      expect(result.breakdown.stabilityScore).toBe(15);
    });

    it("one slash reduces stability", () => {
      const clean = calculateTrustScore(makeInput({ slashHistory: 0 }));
      const slashed = calculateTrustScore(makeInput({ slashHistory: 1 }));
      expect(slashed.breakdown.stabilityScore).toBeLessThan(clean.breakdown.stabilityScore);
    });

    it("multiple slashes further reduce stability", () => {
      const one = calculateTrustScore(makeInput({ slashHistory: 1 }));
      const three = calculateTrustScore(makeInput({ slashHistory: 3 }));
      expect(three.breakdown.stabilityScore).toBeLessThan(one.breakdown.stabilityScore);
    });
  });

  describe("feedback", () => {
    it("50+ feedbacks gives max feedback score", () => {
      const result = calculateTrustScore(makeInput({ feedbackCount: 50 }));
      expect(result.breakdown.feedbackScore).toBe(15);
    });

    it("zero feedbacks gives zero feedback score", () => {
      const result = calculateTrustScore(makeInput({ feedbackCount: 0 }));
      expect(result.breakdown.feedbackScore).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("handles zero stake", () => {
      const result = calculateTrustScore(makeInput({ btcStake: 0n }));
      expect(result.breakdown.stakeScore).toBe(0);
    });

    it("handles very large stake", () => {
      const result = calculateTrustScore(makeInput({ btcStake: btcToWei(1000) }));
      expect(result.breakdown.stakeScore).toBe(40); // capped at 100 * 0.4
    });

    it("clamps reputation to 0-100", () => {
      const over = calculateTrustScore(makeInput({ reputationScore: 150 }));
      const under = calculateTrustScore(makeInput({ reputationScore: -10 }));
      expect(over.breakdown.reputationScore).toBe(30); // 100 * 0.3
      expect(under.breakdown.reputationScore).toBe(0);
    });

    it("total never exceeds 100", () => {
      const result = calculateTrustScore(makeInput({
        btcStake: btcToWei(1000),
        reputationScore: 100,
        feedbackCount: 1000,
        slashHistory: 0,
        uptimeDays: 365,
      }));
      expect(result.total).toBeLessThanOrEqual(100);
    });

    it("breakdown sums to total", () => {
      const result = calculateTrustScore(makeInput({
        btcStake: btcToWei(0.000005),
        reputationScore: 75,
        feedbackCount: 20,
        slashHistory: 1,
        uptimeDays: 10,
      }));
      const sum = result.breakdown.stakeScore
        + result.breakdown.reputationScore
        + result.breakdown.feedbackScore
        + result.breakdown.stabilityScore;
      expect(Math.abs(result.total - sum)).toBeLessThan(0.02); // rounding tolerance
    });
  });
});
