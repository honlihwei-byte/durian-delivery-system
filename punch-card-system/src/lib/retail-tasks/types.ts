export const TASK_CATEGORIES = [
  "opening_checklist",
  "closing_checklist",
  "promotion_pop",
  "stock_refill",
  "price_tag_check",
  "cleaning_check",
  "display_arrangement",
  "inventory_check",
  "customer_issue",
  "special_incident",
  "other",
] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const TASK_PRIORITIES = ["normal", "important", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = [
  "pending",
  "in_progress",
  "submitted",
  "verified",
  "rejected",
  "overdue",
  "exception_reported",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_REPEAT_TYPES = ["one_time", "daily", "weekly"] as const;
export type TaskRepeatType = (typeof TASK_REPEAT_TYPES)[number];

export const TASK_STAFF_ROLES = ["manager", "supervisor", "staff"] as const;
export type TaskStaffRole = (typeof TASK_STAFF_ROLES)[number];

export const FEEDBACK_REASON_TYPES = [
  "not_enough_staff",
  "stock_not_arrived",
  "equipment_problem",
  "customer_issue",
  "shop_too_busy",
  "manager_instruction_changed",
  "other",
] as const;
export type FeedbackReasonType = (typeof FEEDBACK_REASON_TYPES)[number];

export const TASK_ACTION_TYPES = [
  "created",
  "assigned",
  "started",
  "submitted",
  "verified",
  "rejected",
  "exception_reported",
  "comment_added",
  "photo_uploaded",
  "feedback_added",
  "status_changed",
  "updated",
  "deleted",
] as const;
export type TaskActionType = (typeof TASK_ACTION_TYPES)[number];

export type RetailTaskRow = {
  id: string;
  company_id: string;
  shop_id: string;
  assigned_staff_id: string | null;
  verifier_staff_id: string | null;
  title: string;
  description: string | null;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string;
  due_time: string | null;
  repeat_type: TaskRepeatType;
  photo_required: boolean;
  gps_required: boolean;
  feedback_allowed: boolean;
  created_by: string | null;
  started_at: string | null;
  started_by: string | null;
  created_at: string;
  updated_at: string;
};

export type RetailTaskSubmissionRow = {
  id: string;
  task_id: string;
  submitted_by: string;
  photo_url: string | null;
  comment: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  gps_distance_meters: number | null;
  gps_status: string | null;
  submitted_at: string;
  status: string;
};

export type RetailTaskFeedbackRow = {
  id: string;
  task_id: string;
  submitted_by: string;
  reason_type: string;
  reason_text: string;
  photo_url: string | null;
  created_at: string;
};

export type RetailTaskActivityRow = {
  id: string;
  task_id: string;
  actor_id: string | null;
  actor_name: string;
  actor_role: string;
  action_type: string;
  old_status: string | null;
  new_status: string | null;
  note: string | null;
  created_at: string;
};

export type RetailTaskVerificationRow = {
  id: string;
  task_id: string;
  submission_id: string | null;
  verifier_id: string;
  decision: "approved" | "rejected";
  rejection_reason: string | null;
  verified_at: string;
};

export type RetailTaskListItem = RetailTaskRow & {
  shop_name?: string;
  assigned_staff_name?: string | null;
  verifier_staff_name?: string | null;
  display_status?: TaskStatus;
};
