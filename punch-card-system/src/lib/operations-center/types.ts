export const OPERATIONS_CONTENT_TYPES = [
  "memo",
  "promotion",
  "announcement",
  "sop",
  "task",
] as const;

export type OperationsContentType = (typeof OPERATIONS_CONTENT_TYPES)[number];

export const OPERATIONS_PHASE1_TYPES = ["memo", "promotion", "announcement"] as const;

export type OperationsPhase1Type = (typeof OPERATIONS_PHASE1_TYPES)[number];

export const OPERATIONS_STATUSES = ["draft", "published", "archived"] as const;

export type OperationsStatus = (typeof OPERATIONS_STATUSES)[number];

export type OperationsAttachmentRow = {
  id: string;
  content_id: string;
  file_name: string;
  mime_type: string;
  storage_path: string;
  file_size: number;
  sort_order: number;
  created_at: string;
};

export type OperationsContentRow = {
  id: string;
  company_id: string;
  title: string;
  description: string;
  content_type: OperationsContentType;
  target_all_shops: boolean;
  require_acknowledgement: boolean;
  publish_date: string;
  expiry_date: string | null;
  status: OperationsStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type OperationsContentListItem = OperationsContentRow & {
  shop_ids: string[];
  shop_names: string[];
  attachment_count: number;
  read_count: number;
  acknowledged_count: number;
  eligible_staff_count: number;
};

export type OperationsContentDetail = OperationsContentRow & {
  shop_ids: string[];
  shop_names: string[];
  attachments: Array<
    OperationsAttachmentRow & {
      preview_url: string | null;
    }
  >;
  read_count: number;
  acknowledged_count: number;
  eligible_staff_count: number;
};

export type EmployeeOperationsFeedItem = {
  id: string;
  title: string;
  description: string;
  content_type: OperationsContentType;
  publish_date: string;
  expiry_date: string | null;
  require_acknowledgement: boolean;
  attachment_count: number;
  is_read: boolean;
  is_acknowledged: boolean;
  preview_attachment: {
    id: string;
    mime_type: string;
    preview_url: string | null;
  } | null;
};

export type OperationsDashboardStats = {
  total_published: number;
  read_rate_pct: number;
  unread_count: number;
  acknowledgement_rate_pct: number | null;
};
