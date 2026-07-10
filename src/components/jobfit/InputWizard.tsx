"use client";

import { useEffect, useMemo, useState } from "react";
import {
  HumanReviewPanel,
  type HumanReviewValues,
} from "@/components/jobfit/HumanReviewPanel";
import { DemoDataButton } from "@/components/jobfit/DemoDataButton";
import { ResultDashboard } from "@/components/jobfit/ResultDashboard";
import { StatusNotice } from "@/components/jobfit/StatusNotice";
import { CompanyStep } from "@/components/jobfit/steps/CompanyStep";
import { JobPostingStep } from "@/components/jobfit/steps/JobPostingStep";
import { PreferenceStep } from "@/components/jobfit/steps/PreferenceStep";
import { UserProfileStep } from "@/components/jobfit/steps/UserProfileStep";
import {
  getJobFitClientErrorMessage,
  networkJobFitErrorMessage,
} from "@/lib/errors/jobfit-errors";
import { renderFinalReportMarkdown } from "@/lib/report/markdown";
import type {
  CurrentLevel,
  FinalJobFitReport,
  GapAnalysis,
  JobRequirementAnalysis,
  LearningRoadmap,
  PreferredProjectStyle,
  ProjectRecommendation,
  UserCapabilityAnalysis,
} from "@/lib/types/jobfit";
import type { DemoJobFitForm } from "@/lib/demo/sample-data";

type WizardForm = {
  targetRole: string;
  rawPosting: string;
  companyName: string;
  talentProfile: string;
  techStack: string;
  projectExperience: string;
  experienceNarrative: string;
  preparationPeriod: string;
  preferredProjectStyle: string;
  currentLevel: string;
};

type InputWizardProps = {
  isMockAI: boolean;
};

type PipelineStepId =
  | "jobPosting"
  | "userProfile"
  | "gap"
  | "projects"
  | "roadmap"
  | "finalReport";
type PipelineStepStatus = "idle" | "pending" | "running" | "done" | "failed";
type PipelineStatuses = Record<PipelineStepId, PipelineStepStatus>;

type PipelineResult = {
  sourceKey: string;
  jobRequirementAnalysis: JobRequirementAnalysis;
  userCapabilityAnalysis: UserCapabilityAnalysis;
  gapAnalysis: GapAnalysis;
  projectRecommendation: ProjectRecommendation;
  learningRoadmap: LearningRoadmap;
  finalReport: FinalJobFitReport | null;
  markdown: string;
};

type JobPostingResponse = { analysis: JobRequirementAnalysis };
type UserProfileResponse = { analysis: UserCapabilityAnalysis };
type GapResponse = { analysis: GapAnalysis };
type ProjectResponse = {
  recommendations: ProjectRecommendation["recommendations"];
  evidence: ProjectRecommendation["aiReasoning"];
};
type RoadmapResponse = { roadmap: LearningRoadmap };
type FinalReportResponse = { report: FinalJobFitReport; markdown: string };
type PythonAgentResponse = {
  sourceKey?: string;
  session_id?: string;
  message?: string;
  report?: PythonAgentReport;
  used_tools?: string[];
  rag_sources?: string[];
  memory_turns?: number;
  error_code?: string;
  action?: string | null;
};

type PythonAgentReport = {
  summary: string;
  job_requirements: {
    responsibilities: string[];
    required_skills: string[];
    preferred_skills: string[];
    talent_keywords: string[];
    evidence: string[];
  };
  user_capabilities: {
    confirmed_skills: string[];
    inferred_skills: string[];
    project_experience: string[];
    documentation_experience: string[];
    weak_evidence: string[];
  };
  gap_analysis: {
    missing_skills: string[];
    study_items: string[];
    project_items: string[];
    priority: string[];
    risk_notes: string[];
    evidence: string[];
  };
  project_recommendations: {
    title: string;
    difficulty: string;
    estimated_weeks: number;
    target_skills: string[];
    description: string;
    required_outputs: string[];
    portfolio_points: string[];
    reduced_scope: string;
    risk_notes: string[];
  }[];
  roadmap: {
    total_weeks: number;
    items: {
      week: number;
      goal: string;
      study_topics: string[];
      practice_tasks: string[];
      project_tasks: string[];
      outputs: string[];
      completion_criteria: string[];
    }[];
  };
  portfolio_checklist: string[];
  cautions: string[];
};

const STORAGE_KEY = "jobfit:pipeline-result:v1";

const initialForm: WizardForm = {
  targetRole: "",
  rawPosting: "",
  companyName: "",
  talentProfile: "",
  techStack: "",
  projectExperience: "",
  experienceNarrative: "",
  preparationPeriod: "",
  preferredProjectStyle: "",
  currentLevel: "",
};

function formKey(form: WizardForm) {
  return JSON.stringify(form);
}

const wizardSteps = [
  {
    title: "목표 직무 및 채용공고 입력",
    fields: ["targetRole", "rawPosting"],
  },
  {
    title: "회사 인재상 입력",
    fields: ["companyName", "talentProfile"],
  },
  {
    title: "사용자 기술스택 및 프로젝트 경험 입력",
    fields: ["techStack", "projectExperience", "experienceNarrative"],
  },
  {
    title: "준비 기간과 프로젝트 선호 방식 입력",
    fields: ["preparationPeriod", "preferredProjectStyle", "currentLevel"],
  },
  {
    title: "분석 실행 확인",
    fields: [],
  },
] as const;

const pipelineSteps = [
  { id: "jobPosting", label: "채용공고 분석 중" },
  { id: "userProfile", label: "사용자 경험 분석 중" },
  { id: "gap", label: "역량 갭 분석 중" },
  { id: "projects", label: "프로젝트 추천 생성 중" },
  { id: "roadmap", label: "학습 로드맵 생성 중" },
  { id: "finalReport", label: "최종 리포트 생성 중" },
] as const satisfies readonly { id: PipelineStepId; label: string }[];

const initialPipelineStatuses: PipelineStatuses = {
  jobPosting: "idle",
  userProfile: "idle",
  gap: "idle",
  projects: "idle",
  roadmap: "idle",
  finalReport: "idle",
};

const fieldLabels: Record<keyof WizardForm, string> = {
  targetRole: "목표 직무",
  rawPosting: "채용공고 원문",
  companyName: "회사명",
  talentProfile: "회사 인재상",
  techStack: "기술스택",
  projectExperience: "프로젝트 경험",
  experienceNarrative: "자기소개서 또는 경험 서술",
  preparationPeriod: "준비 가능 기간",
  preferredProjectStyle: "선호 프로젝트 방식",
  currentLevel: "현재 수준",
};

const reviewSections = [
  {
    title: "채용공고",
    description: "목표 직무와 공고 원문을 기준으로 요구역량을 추출합니다.",
    stepIndex: 0,
    fields: ["targetRole", "rawPosting"],
  },
  {
    title: "회사 정보",
    description: "회사 인재상에서 협업 방식과 가치관 키워드를 뽑습니다.",
    stepIndex: 1,
    fields: ["companyName", "talentProfile"],
  },
  {
    title: "사용자 경험",
    description: "기술스택, 프로젝트 경험, 자기소개서 서술을 역량 근거로 분석합니다.",
    stepIndex: 2,
    fields: ["techStack", "projectExperience", "experienceNarrative"],
  },
  {
    title: "추천 조건",
    description: "준비 기간, 선호 방식, 현재 수준을 프로젝트와 로드맵에 반영합니다.",
    stepIndex: 3,
    fields: ["preparationPeriod", "preferredProjectStyle", "currentLevel"],
  },
] as const satisfies readonly {
  title: string;
  description: string;
  stepIndex: number;
  fields: readonly (keyof WizardForm)[];
}[];

function missingFields(form: WizardForm, stepIndex: number) {
  return wizardSteps[stepIndex].fields.filter((field) => !form[field].trim());
}

function allMissingFields(form: WizardForm) {
  return wizardSteps.flatMap((_, index) => missingFields(form, index));
}

function splitTextList(value: string) {
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function limitText(value: string, maxLength: number) {
  return Array.from(value.trim()).slice(0, maxLength).join("");
}

function previewText(value: string) {
  const text = value.trim().replace(/\s+/g, " ");

  if (!text) {
    return "미입력";
  }

  return text.length > 140 ? `${text.slice(0, 140)}...` : text;
}

function characterCount(value: string) {
  return `${value.trim().length.toLocaleString("ko-KR")}자`;
}

function projectRecommendationFromResponse(
  response: ProjectResponse,
): ProjectRecommendation {
  return {
    recommendations: response.recommendations,
    aiReasoning: response.evidence,
  };
}

function projectTitleForLevel(
  recommendation: ProjectRecommendation,
  currentLevel: string,
) {
  return (
    recommendation.recommendations.find(
      (project) => project.difficulty === currentLevel,
    )?.title ?? recommendation.recommendations[0]?.title
  );
}

function buildJobPostingRequest(form: WizardForm) {
  const postingSummary = limitText(form.rawPosting, 180);

  return {
    jobPosting: {
      rawPosting: limitText(form.rawPosting, 20_000),
      targetRole: limitText(form.targetRole, 200),
      responsibilities: [postingSummary],
      requiredQualifications: [postingSummary],
      preferredQualifications: [],
    },
    companyProfile: {
      companyName: limitText(form.companyName, 200),
      talentProfile: limitText(form.talentProfile, 20_000),
    },
  };
}

function buildUserProfileRequest(form: WizardForm) {
  const techStack = splitTextList(form.techStack).slice(0, 20);
  const projectSummary = limitText(form.projectExperience, 3_000);

  return {
    techStack,
    projectExperiences: [
      {
        title: "사용자 입력 프로젝트 경험",
        summary: projectSummary,
        role: "사용자 입력 기반 역할",
        techStack,
        outcome: limitText(projectSummary, 1_000),
      },
    ],
    personalStatement: limitText(form.experienceNarrative, 20_000),
    preparationPeriod: limitText(form.preparationPeriod, 200),
    preferredProjectStyle: form.preferredProjectStyle,
    currentLevel: form.currentLevel,
  };
}

function buildPythonAgentRequest(form: WizardForm) {
  // Python LangGraph backend로 보낼 입력값 만드는 부분
  return {
    user_message: `목표 직무 ${form.targetRole}에 맞춰 역량 갭, 프로젝트 추천, 로드맵을 생성해줘`,
    job_posting: limitText(form.rawPosting, 20_000),
    company_values: limitText(form.talentProfile, 20_000),
    user_skills: splitTextList(form.techStack).slice(0, 20),
    user_projects: limitText(form.projectExperience, 20_000),
    self_intro: limitText(form.experienceNarrative, 20_000),
    target_role: limitText(form.targetRole, 200),
    preparation_weeks: parsePreparationWeeks(form.preparationPeriod),
    preferred_project_type: form.preferredProjectStyle,
    current_level: form.currentLevel,
  };
}

function parsePreparationWeeks(value: string) {
  const match = value.match(/\d+/);
  if (!match) {
    return 4;
  }

  return Math.min(Math.max(Number(match[0]), 1), 52);
}

function pipelineResultFromPythonAgent(
  response: PythonAgentResponse,
  sourceKey: string,
): PipelineResult {
  if (response.error_code || !response.report) {
    throw new Error(response.message ?? "Python Agent 분석 결과가 비어 있습니다.");
  }

  const report = finalReportFromPythonAgent(response.report);

  return {
    sourceKey,
    jobRequirementAnalysis: report.jobRequirementAnalysis,
    userCapabilityAnalysis: report.userCapabilityAnalysis,
    gapAnalysis: report.gapAnalysis,
    projectRecommendation: report.projectRecommendation,
    learningRoadmap: report.learningRoadmap,
    finalReport: report,
    markdown: renderFinalReportMarkdown(report),
  };
}

function finalReportFromPythonAgent(report: PythonAgentReport): FinalJobFitReport {
  const jobRequirementAnalysis = jobRequirementAnalysisFromPython(report);
  const userCapabilityAnalysis = userCapabilityAnalysisFromPython(report);
  const gapAnalysis = gapAnalysisFromPython(report);
  const projectRecommendation = projectRecommendationFromPython(report);
  const learningRoadmap = learningRoadmapFromPython(report);

  return {
    jobRequirementAnalysis,
    userCapabilityAnalysis,
    gapAnalysis,
    projectRecommendation,
    learningRoadmap,
    portfolioOutputs: listOrFallback(report.portfolio_checklist, [
      "README",
      "테스트 결과",
      "회고",
    ]),
    risksAndWarnings: listOrFallback(report.cautions, [
      "AI 분석은 참고용이며 취업 성공을 보장하지 않습니다.",
    ]),
    aiReasoning: [
      { item: "Python LangGraph Agent", reason: report.summary },
      ...gapAnalysis.aiReasoning,
    ],
  };
}

function jobRequirementAnalysisFromPython(
  report: PythonAgentReport,
): JobRequirementAnalysis {
  const requirements = report.job_requirements;
  const requiredSkills = listOrFallback(requirements.required_skills, [
    "채용공고 핵심 역량",
  ]);

  return {
    coreRequiredCapabilities: requiredSkills
      .concat(requirements.preferred_skills)
      .slice(0, 20)
      .map((skill) => ({
        name: skill,
        category: capabilityCategory(skill),
        evidence: firstOrFallback(requirements.evidence, "채용공고 분석 결과 기반"),
      })),
    talentKeywords: listOrFallback(requirements.talent_keywords, ["협업"]),
    requiredTasks: listOrFallback(requirements.responsibilities, [
      "채용공고 담당업무 분석",
    ]),
    aiReasoning: evidenceList(requirements.evidence, "공고 분석 근거"),
  };
}

function userCapabilityAnalysisFromPython(
  report: PythonAgentReport,
): UserCapabilityAnalysis {
  const capabilities = report.user_capabilities;
  const confirmedSkills = listOrFallback(capabilities.confirmed_skills, [
    "사용자 입력 기반 역량",
  ]);

  return {
    ownedCapabilities: confirmedSkills.slice(0, 20).map((skill) => ({
      name: skill,
      category: capabilityCategory(skill),
      evidence: "사용자 기술스택, 프로젝트 경험, 자기소개서 입력에서 확인",
    })),
    projectEvidence: evidenceList(
      capabilities.project_experience,
      "프로젝트 경험 근거",
    ),
    statementEvidence: evidenceList(
      capabilities.documentation_experience,
      "문서화 경험 근거",
    ),
    aiReasoning: evidenceList(
      capabilities.weak_evidence.concat(capabilities.inferred_skills),
      "사용자 역량 분석 근거",
    ),
  };
}

function gapAnalysisFromPython(report: PythonAgentReport): GapAnalysis {
  const gap = report.gap_analysis;

  return {
    missingCapabilities: listOrFallback(gap.missing_skills, [
      "추가 증명이 필요한 역량",
    ])
      .slice(0, 15)
      .map((skill, index) => ({
        capability: skill,
        gapLevel: gap.priority.includes(skill) ? "높음" : "중간",
        reason:
          gap.evidence[index] ??
          firstOrFallback(gap.evidence, "공고 요구사항 대비 근거가 부족합니다."),
      })),
    studyItems: listOrFallback(gap.study_items, ["부족 역량 학습"]),
    projectProofItems: listOrFallback(gap.project_items, ["프로젝트 산출물로 증명"]),
    risksAndWarnings: listOrFallback(gap.risk_notes, [
      "입력 정보가 부족하면 분석 정확도가 낮아질 수 있습니다.",
    ]),
    aiReasoning: evidenceList(gap.evidence, "갭 분석 근거"),
  };
}

function projectRecommendationFromPython(
  report: PythonAgentReport,
): ProjectRecommendation {
  const fallbackSkills = report.gap_analysis.project_items.concat(
    report.gap_analysis.missing_skills,
  );
  const recommendations = [0, 1, 2].map((index) =>
    recommendedProjectFromPython(
      report.project_recommendations[index],
      index,
      fallbackSkills,
    ),
  ) as ProjectRecommendation["recommendations"];

  return {
    recommendations,
    aiReasoning: evidenceList(
      recommendations.map((project) => project.reason),
      "프로젝트 추천 근거",
    ),
  };
}

function recommendedProjectFromPython(
  project: PythonAgentReport["project_recommendations"][number] | undefined,
  index: number,
  fallbackSkills: string[],
): ProjectRecommendation["recommendations"][number] {
  const difficulties = ["입문", "중급", "고급"] as const;
  const difficulty = difficulties[index];
  const targetSkills = listOrFallback(project?.target_skills, fallbackSkills);
  const baseProject = {
    title: project?.title ?? `${difficulty} 역량 보완 프로젝트`,
    targetRoleConnection: `${targetSkills[0]} 역량을 목표 직무에 맞게 증명합니다.`,
    problemToSolve: project?.description ?? "부족 역량을 실제 산출물로 증명합니다.",
    techStack: targetSkills.slice(0, 5),
    style: "개인" as const,
    difficulty,
    estimatedPeriod: `${project?.estimated_weeks ?? (index + 1) * 2}주`,
    targetCapabilities: targetSkills,
    description: project?.description ?? "Python LangGraph Agent 추천 프로젝트입니다.",
    implementationScope: listOrFallback(project?.target_skills, [
      "핵심 기능 구현",
      "테스트",
      "문서화",
    ]),
    requiredOutputs: listOrFallback(project?.required_outputs, [
      "README",
      "실행 방법",
      "테스트 결과",
    ]),
    readmeContents: ["문제 정의", "기술 선택 이유", "실행 방법", "테스트 결과"],
    interviewPoints: listOrFallback(project?.portfolio_points, [
      "공고 요구역량과 프로젝트 산출물의 연결성",
    ]),
    risks: listOrFallback(project?.risk_notes, ["범위가 커지면 축소 버전부터 완성"]),
    smallerVersion: project?.reduced_scope ?? "핵심 기능 1개와 README부터 완성",
    portfolioOutputs: listOrFallback(project?.required_outputs, ["README"]),
    reason: `${targetSkills[0]} 역량 보완에 직접 연결됩니다.`,
  };

  if (index === 0) {
    return {
      ...baseProject,
      projectType: "단기 프로젝트",
      difficulty: "입문",
    };
  }

  if (index === 1) {
    return {
      ...baseProject,
      projectType: "중급 포트폴리오 프로젝트",
      difficulty: "중급",
    };
  }

  return {
    ...baseProject,
    projectType: "고급 확장 프로젝트",
    difficulty: "고급",
  };
}

function learningRoadmapFromPython(report: PythonAgentReport): LearningRoadmap {
  const steps = report.roadmap.items.map((item) => ({
    period: `${item.week}주차`,
    goals: [item.goal],
    studyItems: listOrFallback(item.study_topics, ["핵심 개념 학습"]),
    practiceTasks: listOrFallback(item.practice_tasks, ["작은 실습 구현"]),
    projectTasks: listOrFallback(item.project_tasks, ["프로젝트 기능 구현"]),
    portfolioOutputs: listOrFallback(item.outputs, ["README 업데이트"]),
    checklist: listOrFallback(item.completion_criteria, ["주차 목표 확인"]),
    risks: ["학습과 산출물이 분리되지 않도록 매주 결과물을 남깁니다."],
    completionCriteria: listOrFallback(item.completion_criteria, ["산출물 제출 가능"]),
  }));

  return {
    fourWeekRoadmap: report.roadmap.total_weeks <= 4 ? steps.slice(0, 4) : [],
    eightWeekRoadmap:
      report.roadmap.total_weeks > 4 && report.roadmap.total_weeks <= 8
        ? steps.slice(0, 8)
        : [],
    twelveWeekRoadmap: report.roadmap.total_weeks > 8 ? steps.slice(0, 12) : [],
    aiReasoning: evidenceList([report.summary], "로드맵 생성 근거"),
  };
}

function evidenceList(items: readonly string[], label: string) {
  return listOrFallback(items, ["입력 정보 기반 분석"]).slice(0, 10).map((item) => ({
    item: label,
    reason: item,
  }));
}

function listOrFallback(
  items: readonly string[] | undefined,
  fallback: readonly string[],
) {
  const cleanItems = (items ?? []).map((item) => item.trim()).filter(Boolean);
  return cleanItems.length > 0 ? cleanItems : [...fallback];
}

function firstOrFallback(items: readonly string[] | undefined, fallback: string) {
  return listOrFallback(items, [fallback])[0];
}

function capabilityCategory(
  value: string,
): JobRequirementAnalysis["coreRequiredCapabilities"][number]["category"] {
  if (/협업|커뮤니케이션|문서|README|회고/.test(value)) {
    return "커뮤니케이션";
  }
  if (/도메인|금융|제조|인프라|임베디드/.test(value)) {
    return "도메인";
  }
  if (/문제|장애|개선|해결|분석/.test(value)) {
    return "문제해결";
  }
  return "기술";
}

async function postJson<TResponse>(url: string, body: unknown) {
  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(networkJobFitErrorMessage());
  }

  let json: unknown = null;

  try {
    json = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(getJobFitClientErrorMessage(json));
    }

    throw new Error("API 응답이 비어 있습니다. 잠시 후 다시 시도해 주세요.");
  }

  if (!response.ok) {
    throw new Error(getJobFitClientErrorMessage(json));
  }

  return json as TResponse;
}

function statusLabel(status: PipelineStepStatus) {
  if (status === "running") {
    return "진행 중";
  }
  if (status === "done") {
    return "완료";
  }
  if (status === "failed") {
    return "실패";
  }
  if (status === "pending") {
    return "대기";
  }
  return "미실행";
}

export function InputWizard({ isMockAI }: InputWizardProps) {
  const [form, setForm] = useState(initialForm);
  const [stepIndex, setStepIndex] = useState(0);
  const [usePythonAgent, setUsePythonAgent] = useState(false);
  const [pythonAgentResult, setPythonAgentResult] =
    useState<PythonAgentResponse | null>(null);
  const [error, setError] = useState("");
  const [analysisMessage, setAnalysisMessage] = useState("");
  const [analysisError, setAnalysisError] = useState("");
  const [statuses, setStatuses] = useState<PipelineStatuses>(
    initialPipelineStatuses,
  );
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(
    null,
  );

  const currentStep = wizardSteps[stepIndex];
  const isLastStep = stepIndex === wizardSteps.length - 1;
  const isRunning = Object.values(statuses).some((status) => status === "running");
  const hasFailed = Object.values(statuses).some((status) => status === "failed");
  const currentFormKey = useMemo(() => formKey(form), [form]);
  const currentPipelineResult =
    pipelineResult?.sourceKey === currentFormKey ? pipelineResult : null;
  const finalizedResult = currentPipelineResult?.finalReport
    ? {
        jobRequirementAnalysis: currentPipelineResult.jobRequirementAnalysis,
        userCapabilityAnalysis: currentPipelineResult.userCapabilityAnalysis,
        gapAnalysis: currentPipelineResult.gapAnalysis,
        projectRecommendation: currentPipelineResult.projectRecommendation,
        learningRoadmap: currentPipelineResult.learningRoadmap,
        finalReport: currentPipelineResult.finalReport,
        markdown: currentPipelineResult.markdown,
      }
    : null;
  const reviewMissingFields = allMissingFields(form);
  const isReadyForAnalysis = reviewMissingFields.length === 0;
  const shouldShowPipelineStatus =
    isLastStep ||
    isRunning ||
    hasFailed ||
    Boolean(currentPipelineResult || analysisError || analysisMessage);
  const completionText = useMemo(
    () =>
      `${Object.values(form).filter((value) => value.trim()).length}/${Object.keys(form).length}`,
    [form],
  );

  useEffect(() => {
    const savedResult = window.localStorage.getItem(STORAGE_KEY);

    if (!savedResult) {
      return;
    }

    try {
      const parsedResult = JSON.parse(savedResult) as PipelineResult;

      if (parsedResult.sourceKey === currentFormKey) {
        setPipelineResult(parsedResult);
        setAnalysisMessage("저장된 분석 결과를 불러왔습니다.");
        return;
      }

      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [currentFormKey]);

  function setPipelineStatus(id: PipelineStepId, status: PipelineStepStatus) {
    setStatuses((current) => ({ ...current, [id]: status }));
  }

  function savePipelineResult(nextResult: PipelineResult) {
    setPipelineResult(nextResult);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextResult));
  }

  function updateField(field: keyof WizardForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
    setAnalysisError("");
    setAnalysisMessage("");

    if (pipelineResult) {
      setPipelineResult(null);
      setStatuses(initialPipelineStatuses);
      window.localStorage.removeItem(STORAGE_KEY);
    }

    if (pythonAgentResult) {
      setPythonAgentResult(null);
    }
  }

  function applyDemoData(demoForm: DemoJobFitForm) {
    setForm(demoForm);
    setStepIndex(0);
    setError("");
    setAnalysisError("");
    setAnalysisMessage("샘플 데이터가 입력되었습니다.");
    setStatuses(initialPipelineStatuses);
    setPipelineResult(null);
    setPythonAgentResult(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }

  function goNext() {
    const emptyFields = missingFields(form, stepIndex);

    if (emptyFields.length > 0) {
      setError(
        `${emptyFields.map((field) => fieldLabels[field]).join(", ")}을 입력해 주세요.`,
      );
      return;
    }

    setStepIndex((current) => Math.min(current + 1, wizardSteps.length - 1));
  }

  function goPrevious() {
    setError("");
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  async function regenerateRoadmap(values: HumanReviewValues) {
    if (!currentPipelineResult || isRunning) {
      return;
    }

    setAnalysisError("");
    setAnalysisMessage("");
    setPipelineStatus("roadmap", "running");
    setPipelineStatus("finalReport", "pending");

    try {
      const roadmapResponse = await postJson<RoadmapResponse>(
        "/api/recommend/roadmap",
        {
          gapAnalysis: currentPipelineResult.gapAnalysis,
          projectRecommendation: currentPipelineResult.projectRecommendation,
          preparationPeriod: values.preparationPeriod,
          preferredProjectStyle: values.preferredProjectStyle,
          currentLevel: values.currentLevel,
          selectedProjectTitle: values.selectedProjectTitle,
          feedback: values.feedback,
        },
      );
      const nextResult: PipelineResult = {
        ...currentPipelineResult,
        learningRoadmap: roadmapResponse.roadmap,
        finalReport: null,
        markdown: "",
      };

      setPipelineStatus("roadmap", "done");
      setPipelineStatus("finalReport", "pending");
      savePipelineResult(nextResult);
      setAnalysisMessage("사용자 피드백을 반영해 로드맵을 재생성했습니다.");
    } catch (roadmapError) {
      setPipelineStatus("roadmap", "failed");
      setAnalysisError(
        `학습 로드맵 생성 중 실패: ${
          roadmapError instanceof Error
            ? roadmapError.message
            : "알 수 없는 오류가 발생했습니다."
        }`,
      );
    }
  }

  async function approveFinalReport() {
    if (!currentPipelineResult || isRunning) {
      return;
    }

    setAnalysisError("");
    setAnalysisMessage("");
    setPipelineStatus("finalReport", "running");

    try {
      const finalReportResponse = await postJson<FinalReportResponse>(
        "/api/report/final",
        {
          jobRequirementAnalysis: currentPipelineResult.jobRequirementAnalysis,
          userCapabilityAnalysis: currentPipelineResult.userCapabilityAnalysis,
          gapAnalysis: currentPipelineResult.gapAnalysis,
          projectRecommendation: currentPipelineResult.projectRecommendation,
          learningRoadmap: currentPipelineResult.learningRoadmap,
        },
      );
      const nextResult: PipelineResult = {
        ...currentPipelineResult,
        finalReport: finalReportResponse.report,
        markdown: finalReportResponse.markdown,
      };

      setPipelineStatus("finalReport", "done");
      savePipelineResult(nextResult);
      setAnalysisMessage("사용자 승인 후 최종 리포트를 생성했습니다.");
    } catch (reportError) {
      setPipelineStatus("finalReport", "failed");
      setAnalysisError(
        `최종 리포트 생성 중 실패: ${
          reportError instanceof Error
            ? reportError.message
            : "알 수 없는 오류가 발생했습니다."
        }`,
      );
    }
  }

async function startPythonAgentAnalysis() {
    // Python Agent 옵션 체크했을 때 실행되는 분석 흐름
    const analysisSourceKey = formKey(form);

    setStatuses(
      Object.fromEntries(
        pipelineSteps.map((step) => [step.id, "pending"]),
      ) as PipelineStatuses,
    );
    setAnalysisError("");
    setAnalysisMessage("");
    setPipelineResult(null);
    setPythonAgentResult(null);
    window.localStorage.removeItem(STORAGE_KEY);
    setPipelineStatus("jobPosting", "running");

    try {
      const response = await postJson<PythonAgentResponse>(
        "/api/python-agent/jobfit",
        buildPythonAgentRequest(form),
      );
      const nextResult = pipelineResultFromPythonAgent(
        response,
        analysisSourceKey,
      );

      setStatuses(
        Object.fromEntries(
          pipelineSteps.map((step) => [step.id, "done"]),
        ) as PipelineStatuses,
      );
      setPythonAgentResult({ sourceKey: analysisSourceKey, ...response });
      savePipelineResult(nextResult);
      setAnalysisMessage("Python LangGraph Agent 분석 결과를 생성했습니다.");
    } catch (pythonError) {
      setPipelineStatus("jobPosting", "failed");
      setAnalysisError(
        pythonError instanceof Error
          ? pythonError.message
          : "Python backend가 실행 중인지 확인하세요.",
      );
    }
  }

  async function startAnalysis() {
    if (isRunning) {
      setAnalysisMessage("이미 분석을 진행 중입니다. 현재 단계가 끝난 뒤 다시 시도해 주세요.");
      return;
    }

    const emptyFields = allMissingFields(form);

    if (emptyFields.length > 0) {
      setError(
        `${emptyFields.map((field) => fieldLabels[field]).join(", ")}을 입력해 주세요.`,
      );
      return;
    }

    if (usePythonAgent) {
      await startPythonAgentAnalysis();
      return;
    }

    let activeStep: PipelineStepId = "jobPosting";
    const analysisSourceKey = formKey(form);
    const jobPostingRequest = buildJobPostingRequest(form);
    setStatuses(
      Object.fromEntries(
        pipelineSteps.map((step) => [step.id, "pending"]),
      ) as PipelineStatuses,
    );
    setAnalysisError("");
    setAnalysisMessage("");
    setPipelineResult(null);
    setPythonAgentResult(null);
    window.localStorage.removeItem(STORAGE_KEY);

    try {
      activeStep = "jobPosting";
      setPipelineStatus(activeStep, "running");
      const jobPostingResponse = await postJson<JobPostingResponse>(
        "/api/analyze/job-posting",
        jobPostingRequest,
      );
      const jobRequirementAnalysis = jobPostingResponse.analysis;
      setPipelineStatus(activeStep, "done");

      activeStep = "userProfile";
      setPipelineStatus(activeStep, "running");
      const userProfileRequest = buildUserProfileRequest(form);
      const userProfileResponse = await postJson<UserProfileResponse>(
        "/api/analyze/user-profile",
        userProfileRequest,
      );
      const userCapabilityAnalysis = userProfileResponse.analysis;
      setPipelineStatus(activeStep, "done");

      activeStep = "gap";
      setPipelineStatus(activeStep, "running");
      const gapResponse = await postJson<GapResponse>("/api/analyze/gap", {
        jobRequirementAnalysis,
        userCapabilityAnalysis,
      });
      const gapAnalysis = gapResponse.analysis;
      setPipelineStatus(activeStep, "done");

      activeStep = "projects";
      setPipelineStatus(activeStep, "running");
      const projectResponse = await postJson<ProjectResponse>(
        "/api/recommend/projects",
        {
          gapAnalysis,
          targetRole: form.targetRole,
          techStack: userProfileRequest.techStack,
          existingExperienceSummary: limitText(form.projectExperience, 3_000),
          preferredProjectStyle: form.preferredProjectStyle,
          currentLevel: form.currentLevel,
          jobPosting: jobPostingRequest.jobPosting,
          companyProfile: jobPostingRequest.companyProfile,
          userProfile: userProfileRequest,
        },
      );
      const projectRecommendation =
        projectRecommendationFromResponse(projectResponse);
      setPipelineStatus(activeStep, "done");

      activeStep = "roadmap";
      setPipelineStatus(activeStep, "running");
      const roadmapResponse = await postJson<RoadmapResponse>(
        "/api/recommend/roadmap",
        {
          gapAnalysis,
          projectRecommendation,
          preparationPeriod: form.preparationPeriod,
          preferredProjectStyle: form.preferredProjectStyle,
          currentLevel: form.currentLevel,
          selectedProjectTitle: projectTitleForLevel(
            projectRecommendation,
            form.currentLevel,
          ),
        },
      );
      const learningRoadmap = roadmapResponse.roadmap;
      setPipelineStatus(activeStep, "done");
      setPipelineStatus("finalReport", "pending");

      const nextResult: PipelineResult = {
        sourceKey: analysisSourceKey,
        jobRequirementAnalysis,
        userCapabilityAnalysis,
        gapAnalysis,
        projectRecommendation,
        learningRoadmap,
        finalReport: null,
        markdown: "",
      };
      savePipelineResult(nextResult);
      setAnalysisMessage(
        "추천과 로드맵이 생성되었습니다. 검토 후 최종 리포트를 승인해 주세요.",
      );
    } catch (pipelineError) {
      setPipelineStatus(activeStep, "failed");
      setAnalysisError(
        `${pipelineSteps.find((step) => step.id === activeStep)?.label ?? "분석 단계"} 실패: ${
          pipelineError instanceof Error
            ? pipelineError.message
            : "알 수 없는 오류가 발생했습니다."
        }`,
      );
    }
  }

  return (
    <section className="mx-auto w-full max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8 2xl:px-10">
      <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-700">JobFit Agent</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl">
            채용공고 기반 역량 분석 입력
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-700">
            채용공고, 회사 인재상, 본인 경험을 단계별로 입력해 분석 준비 데이터를 구성합니다.
          </p>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-700">
            입력 {completionText}
          </span>
          <span
            className={
              isMockAI
                ? "rounded-md bg-emerald-100 px-3 py-2 font-semibold text-emerald-800"
                : "rounded-md bg-slate-200 px-3 py-2 font-semibold text-slate-700"
            }
          >
            MOCK_AI {isMockAI ? "ON" : "OFF"}
          </span>
        </div>
      </div>

      <div className="mb-8">
        <DemoDataButton onSelect={applyDemoData} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]">
        <nav aria-label="입력 단계" className="space-y-2 lg:sticky lg:top-6 lg:self-start">
          {wizardSteps.map((step, index) => (
            <button
              key={step.title}
              type="button"
              className={`flex w-full items-center gap-3 rounded-md border px-3 py-3 text-left text-sm ${
                index === stepIndex
                  ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
              onClick={() => {
                if (index <= stepIndex) {
                  setStepIndex(index);
                  setError("");
                }
              }}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                {index + 1}
              </span>
              <span className="font-semibold">{step.title}</span>
            </button>
          ))}
        </nav>

        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-6">
            <p className="text-sm text-slate-500">
              {stepIndex + 1} / {wizardSteps.length}
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950">
              {currentStep.title}
            </h2>
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              개인정보, 연락처, 주민등록번호, 상세 주소, 계좌번호는 입력하지 마세요.
            </p>
          </div>

          {stepIndex === 0 ? (
            <JobPostingStep
              targetRole={form.targetRole}
              rawPosting={form.rawPosting}
              onChange={updateField}
            />
          ) : stepIndex === 1 ? (
            <CompanyStep
              companyName={form.companyName}
              talentProfile={form.talentProfile}
              onChange={updateField}
            />
          ) : stepIndex === 2 ? (
            <UserProfileStep
              techStack={form.techStack}
              projectExperience={form.projectExperience}
              experienceNarrative={form.experienceNarrative}
              onChange={updateField}
            />
          ) : stepIndex === 3 ? (
            <PreferenceStep
              preparationPeriod={form.preparationPeriod}
              preferredProjectStyle={form.preferredProjectStyle}
              currentLevel={form.currentLevel}
              onChange={updateField}
            />
          ) : (
            <div className="space-y-6">
              <div
                className={`rounded-md border px-4 py-4 ${
                  isReadyForAnalysis
                    ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                    : "border-amber-200 bg-amber-50 text-amber-950"
                }`}
              >
                <p className="text-sm font-semibold">분석 준비 상태</p>
                <p className="mt-1 text-lg font-bold">
                  {isReadyForAnalysis ? "입력 완료" : "보완 필요"}
                </p>
                <p className="mt-2 text-sm leading-6">
                  {isReadyForAnalysis
                    ? "입력값이 모두 채워졌습니다. 아래 요약을 확인한 뒤 분석을 실행하세요."
                    : `${reviewMissingFields
                        .map((field) => fieldLabels[field])
                        .join(", ")} 입력이 필요합니다.`}
                </p>
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
                <div className="space-y-6">
                  {reviewSections.map((section) => {
                    const sectionMissingFields = section.fields.filter(
                      (field) => !form[field].trim(),
                    );

                    return (
                      <section
                        key={section.title}
                        className="border-t border-slate-200 pt-5 first:border-t-0 first:pt-0"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-base font-bold text-slate-950">
                              {section.title}
                            </h3>
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                              {section.description}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="shrink-0 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            onClick={() => {
                              setStepIndex(section.stepIndex);
                              setError("");
                            }}
                          >
                            수정
                          </button>
                        </div>

                        {sectionMissingFields.length > 0 ? (
                          <p className="mt-3 rounded-md bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900">
                            {sectionMissingFields
                              .map((field) => fieldLabels[field])
                              .join(", ")}{" "}
                            미입력
                          </p>
                        ) : null}

                        <dl className="mt-4 divide-y divide-slate-100 border-y border-slate-200">
                          {section.fields.map((field) => (
                            <div
                              key={field}
                              className="grid gap-2 py-3 sm:grid-cols-[140px_1fr]"
                            >
                              <dt className="text-sm font-semibold text-slate-900">
                                {fieldLabels[field]}
                              </dt>
                              <dd>
                                <p
                                  className={`max-h-24 overflow-hidden text-sm leading-6 ${
                                    form[field].trim()
                                      ? "text-slate-700"
                                      : "text-red-700"
                                  }`}
                                >
                                  {previewText(form[field])}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {characterCount(form[field])}
                                </p>
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </section>
                    );
                  })}
                </div>

                <aside className="space-y-4">
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-sm font-bold text-slate-950">
                      분석 실행 순서
                    </h3>
                    <ol className="mt-3 space-y-2 text-sm text-slate-700">
                      {pipelineSteps.map((step, index) => (
                        <li key={step.id} className="flex gap-2">
                          <span className="font-bold text-slate-950">
                            {index + 1}.
                          </span>
                          <span>{step.label.replace(" 중", "")}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="rounded-md border border-slate-200 bg-white p-4">
                    <h3 className="text-sm font-bold text-slate-950">
                      생성 결과
                    </h3>
                    <ul className="mt-3 space-y-2 text-sm text-slate-700">
                      <li>역량 갭 분석</li>
                      <li>추천 프로젝트 3개</li>
                      <li>4주/8주/12주 로드맵</li>
                      <li>Markdown 리포트</li>
                    </ul>
                  </div>

                  <label className="block rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
                    <span className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-emerald-300"
                        checked={usePythonAgent}
                        disabled={isRunning}
                        onChange={(event) => {
                          setUsePythonAgent(event.target.checked);
                          setAnalysisError("");
                          setAnalysisMessage("");
                          setPythonAgentResult(null);
                        }}
                      />
                      <span>
                        <span className="block font-bold">
                          Python LangGraph Agent 사용
                        </span>
                        <span className="mt-1 block leading-6 text-emerald-900">
                          선택 시 Python FastAPI backend의 `/agent/jobfit`을
                          호출하고 JSON 결과를 표시합니다.
                        </span>
                      </span>
                    </span>
                  </label>
                </aside>
              </div>
            </div>
          )}

          {shouldShowPipelineStatus ? (
            <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-bold text-slate-950">분석 진행 상태</h3>
              <ol className="mt-3 space-y-2">
                {pipelineSteps.map((step) => (
                  <li
                    key={step.id}
                    className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-slate-800">{step.label}</span>
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-bold ${
                        statuses[step.id] === "done"
                          ? "bg-emerald-100 text-emerald-800"
                          : statuses[step.id] === "failed"
                            ? "bg-red-100 text-red-700"
                            : statuses[step.id] === "running"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {statusLabel(statuses[step.id])}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {isRunning ? (
            <StatusNotice
              variant="info"
              title="분석 진행 중"
              message="현재 실행 중인 단계가 끝날 때까지 새 요청을 막고 있습니다."
            />
          ) : null}

          {error ? (
            <StatusNotice variant="error" message={error} />
          ) : null}

          {analysisError ? (
            <StatusNotice variant="error" title="분석 실패" message={analysisError}>
              <button
                type="button"
                className="mt-3 rounded-md border border-red-300 px-3 py-2 font-semibold hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={startAnalysis}
                disabled={isRunning}
              >
                재시도
              </button>
            </StatusNotice>
          ) : null}

          {analysisMessage ? (
            <StatusNotice variant="success" message={analysisMessage} />
          ) : null}

          {pythonAgentResult ? (
            /* Python backend 원문 JSON 확인용. 기본은 접혀 있음 */
            <details className="mt-6 rounded-md border border-slate-200 bg-slate-950 p-4 text-slate-100">
              <summary className="cursor-pointer">
                <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-lg font-bold">
                      Python LangGraph Agent JSON 결과 보기
                    </h3>
                    <p className="mt-1 text-sm text-slate-300">
                      FastAPI backend 응답 원문입니다. 클릭해서 열고 닫을 수 있습니다.
                    </p>
                  </div>
                  <span className="mt-2 inline-flex w-fit rounded-md bg-slate-800 px-3 py-1 text-xs font-bold text-slate-200 sm:mt-0">
                    열기 / 닫기
                  </span>
                </div>
              </summary>
              <pre className="mt-4 max-h-[520px] overflow-auto rounded-md bg-slate-900 p-4 text-xs leading-5 text-slate-100">
                {JSON.stringify(pythonAgentResult, null, 2)}
              </pre>
            </details>
          ) : null}

          {currentPipelineResult && !currentPipelineResult.finalReport ? (
            <HumanReviewPanel
              preparationPeriod={form.preparationPeriod}
              preferredProjectStyle={
                form.preferredProjectStyle as PreferredProjectStyle
              }
              currentLevel={form.currentLevel as CurrentLevel}
              projectRecommendation={currentPipelineResult.projectRecommendation}
              learningRoadmap={currentPipelineResult.learningRoadmap}
              isRegenerating={statuses.roadmap === "running"}
              isApproving={statuses.finalReport === "running"}
              onRegenerateRoadmap={regenerateRoadmap}
              onApproveFinalReport={approveFinalReport}
            />
          ) : null}

          {finalizedResult ? <ResultDashboard result={finalizedResult} /> : null}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-between">
            <button
              type="button"
              className="rounded-md border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={goPrevious}
              disabled={stepIndex === 0 || isRunning}
            >
              이전
            </button>

            {isLastStep ? (
              <button
                type="button"
                className="rounded-md bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={startAnalysis}
                disabled={isRunning}
              >
                {hasFailed ? "다시 분석 시작" : "분석 시작"}
              </button>
            ) : (
              <button
                type="button"
                className="rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={goNext}
                disabled={isRunning}
              >
                다음
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
