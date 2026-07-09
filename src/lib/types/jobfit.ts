import type { z } from "zod";
import type {
  CompanyProfileInputSchema,
  CurrentLevelSchema,
  FinalJobFitReportSchema,
  GapAnalysisSchema,
  JobPostingInputSchema,
  JobRequirementAnalysisSchema,
  LearningRoadmapSchema,
  PreferredProjectStyleSchema,
  ProjectDifficultySchema,
  ProjectRecommendationSchema,
  UserCapabilityAnalysisSchema,
  UserProfileInputSchema,
} from "@/lib/schemas/jobfit";

export type PreferredProjectStyle = z.infer<typeof PreferredProjectStyleSchema>;
export type CurrentLevel = z.infer<typeof CurrentLevelSchema>;
export type ProjectDifficulty = z.infer<typeof ProjectDifficultySchema>;

export type JobPostingInput = z.infer<typeof JobPostingInputSchema>;
export type CompanyProfileInput = z.infer<typeof CompanyProfileInputSchema>;
export type UserProfileInput = z.infer<typeof UserProfileInputSchema>;

export type JobRequirementAnalysis = z.infer<typeof JobRequirementAnalysisSchema>;
export type UserCapabilityAnalysis = z.infer<typeof UserCapabilityAnalysisSchema>;
export type GapAnalysis = z.infer<typeof GapAnalysisSchema>;
export type ProjectRecommendation = z.infer<typeof ProjectRecommendationSchema>;
export type LearningRoadmap = z.infer<typeof LearningRoadmapSchema>;
export type FinalJobFitReport = z.infer<typeof FinalJobFitReportSchema>;
