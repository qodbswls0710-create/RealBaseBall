import type { WorkRequest } from "./types";

export const requiredTeams = ["기획팀", "개발팀", "아트팀"] as const;
export function hasDepartmentOpinion(
  directive: Pick<WorkRequest, "opinions">,
  team: string,
) {
  return Boolean(
    directive.opinions?.some(
      (opinion) =>
        opinion.team === team &&
        typeof opinion.content === "string" &&
        opinion.content.trim().length > 0,
    ),
  );
}
export function hasAllDepartmentOpinions(
  directive: Pick<WorkRequest, "opinions">,
) {
  return requiredTeams.every((team) => hasDepartmentOpinion(directive, team));
}
export function hasSynthesizedPlan(
  directive: Pick<WorkRequest, "plan" | "planGeneratedAt">,
) {
  return Boolean(
    typeof directive.plan === "string" &&
    directive.plan.trim() &&
    typeof directive.planGeneratedAt === "string" &&
    directive.planGeneratedAt.trim() &&
    Number.isFinite(Date.parse(directive.planGeneratedAt)),
  );
}
