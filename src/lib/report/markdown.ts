import type {
  FinalJobFitReport,
  LearningRoadmap,
  ProjectRecommendation,
} from "@/lib/types/jobfit";

function renderList(items: readonly string[]) {
  return items.length > 0
    ? items.map((item) => `- ${item}`).join("\n")
    : "- 입력 정보만으로 판단 불가";
}

function renderRoadmap(
  title: string,
  steps: LearningRoadmap["fourWeekRoadmap"],
) {
  if (steps.length === 0) {
    return "";
  }

  return [
    `### ${title}`,
    ...steps.map(
      (step) => `
#### ${step.period}
- 목표
${renderList(step.goals)}
- 학습 주제
${renderList(step.studyItems)}
- 실습 과제
${renderList(step.practiceTasks)}
- 프로젝트 진행 단계
${renderList(step.projectTasks)}
- 산출물
${renderList(step.portfolioOutputs)}
- 체크리스트
${renderList(step.checklist)}
- 위험 요소
${renderList(step.risks)}
- 완료 기준
${renderList(step.completionCriteria)}`,
    ),
  ].join("\n\n");
}

function renderProjects(projects: ProjectRecommendation["recommendations"]) {
  return projects
    .map(
      (project) => `
### ${project.title}
- 유형: ${project.projectType}
- 목표 직무와의 연결성: ${project.targetRoleConnection}
- 해결하는 문제: ${project.problemToSolve}
- 사용 기술: ${project.techStack.join(", ")}
- 예상 기간: ${project.estimatedPeriod}
- 개인/팀 적합성: ${project.style}
- 구현 범위
${renderList(project.implementationScope)}
- 필수 산출물
${renderList(project.requiredOutputs)}
- README에 적어야 할 내용
${renderList(project.readmeContents)}
- 면접에서 어필할 포인트
${renderList(project.interviewPoints)}
- 위험 요소
${renderList(project.risks)}
- 축소 버전: ${project.smallerVersion}
- 추천 근거: ${project.reason}`,
    )
    .join("\n\n");
}

function renderProjectDifficulty(
  projects: ProjectRecommendation["recommendations"],
) {
  return projects
    .map(
      (project) =>
        `- ${project.title}: ${project.difficulty} (${project.estimatedPeriod})`,
    )
    .join("\n");
}

function renderRoadmaps(roadmap: LearningRoadmap) {
  return [
    renderRoadmap("4주 로드맵", roadmap.fourWeekRoadmap),
    renderRoadmap("8주 로드맵", roadmap.eightWeekRoadmap),
    renderRoadmap("12주 로드맵", roadmap.twelveWeekRoadmap),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function renderFinalReportMarkdown(report: FinalJobFitReport) {
  return `# JobFit Agent 최종 리포트

## 1. 목표 직무 요약
입력된 채용공고 분석 결과 기준으로 주요 업무와 요구역량을 요약합니다.

### 주요 업무
${renderList(report.jobRequirementAnalysis.requiredTasks)}

### 핵심 요구역량
${renderList(report.jobRequirementAnalysis.coreRequiredCapabilities.map((capability) => `${capability.name} (${capability.category}) - 근거: ${capability.evidence}`))}

## 2. 채용공고 요구역량
${renderList(report.jobRequirementAnalysis.coreRequiredCapabilities.map((capability) => `${capability.name}: ${capability.evidence}`))}

## 3. 사용자 보유 역량
${renderList(report.userCapabilityAnalysis.ownedCapabilities.map((capability) => `${capability.name} (${capability.category}) - 근거: ${capability.evidence}`))}

## 4. 역량 갭 분석
${renderList(report.gapAnalysis.missingCapabilities.map((gap) => `${gap.capability} [${gap.gapLevel}] - ${gap.reason}`))}

## 5. 공부해야 할 내용
${renderList(report.gapAnalysis.studyItems)}

## 6. 추천 프로젝트
${renderProjects(report.projectRecommendation.recommendations)}

## 7. 프로젝트 난이도
${renderProjectDifficulty(report.projectRecommendation.recommendations)}

## 8. 학습 로드맵
${renderRoadmaps(report.learningRoadmap)}

## 9. 포트폴리오 산출물 체크리스트
${renderList(report.portfolioOutputs.map((output) => `[ ] ${output}`))}

## 10. 주의사항
${renderList(report.risksAndWarnings)}

## 11. AI 분석 한계
- 이 리포트는 사용자가 제공한 분석 결과를 바탕으로 정리한 참고 자료입니다.
- 취업 성공, 합격 가능성, 평가 결과를 보장하지 않습니다.
- 채용공고 원문에 없는 요구사항은 단정하지 않습니다.
- 사용자가 실제 수행하지 않은 경험을 이미 수행한 것처럼 표현하지 않습니다.
- 최종 지원 전략은 최신 공고와 본인의 실제 경험을 기준으로 다시 검토해야 합니다.

### AI 판단 근거
${renderList(report.aiReasoning.map((reasoning) => `${reasoning.item}: ${reasoning.reason}`))}
`;
}
