export type FirstStepTaskType =
  | "communication"
  | "submit_send"
  | "edit_create"
  | "confirm_lookup"
  | "offline_execute"
  | "organize_household"
  | "decision";

export type FirstStepFrictionSource =
  | "task_too_large"
  | "current_scene_unsuitable"
  | "current_time_unsuitable"
  | "missing_material"
  | "missing_information"
  | "entry_not_open"
  | "psychological_barrier"
  | "repeated_delay";

export type FirstStepDecompositionType =
  | "open_entry"
  | "prepare_material"
  | "confirm_information"
  | "minimum_execute"
  | "lower_psychological_barrier"
  | "alternative_scene";

export type FirstStepRecommendationOutput = {
  can_do_now: boolean;
  friction_source: FirstStepFrictionSource;
  decomposition_type: FirstStepDecompositionType;
  recommended_first_step: string;
  why_this_step: string;
  is_smaller_than_original: boolean;
  confidence: number;
};

export type FirstStepModelExpressionOutput = {
  recommended_first_step: string;
  why_this_step: string;
  confidence: number;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeShortText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized || normalized.length > maxLength) {
    return null;
  }

  if (
    /(\n|1\.|2\.|3\.|首先|然后|接着|最后|步骤|第一步|第二步)/.test(
      normalized,
    )
  ) {
    return null;
  }

  return normalized;
}

export function parseFirstStepModelExpressionOutput(
  value: unknown,
): FirstStepModelExpressionOutput | null {
  if (!isPlainObject(value)) {
    return null;
  }

  const recommendedFirstStep = normalizeShortText(
    value.recommended_first_step,
    40,
  );
  const whyThisStep = normalizeShortText(value.why_this_step, 32);
  const confidence =
    typeof value.confidence === "number" && Number.isFinite(value.confidence)
      ? value.confidence
      : null;

  if (
    !recommendedFirstStep ||
    !whyThisStep ||
    confidence === null ||
    confidence < 0 ||
    confidence > 1
  ) {
    return null;
  }

  return {
    recommended_first_step: recommendedFirstStep,
    why_this_step: whyThisStep,
    confidence: Number(confidence.toFixed(2)),
  };
}
