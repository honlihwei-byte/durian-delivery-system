import { malaysiaDateYmd } from "@/lib/malaysia-time";
import {
  buildOperationsAttachmentPath,
  isPreviewableMime,
  OPERATIONS_ALLOWED_MIME_TYPES,
  OPERATIONS_ATTACHMENT_MAX_BYTES,
  OPERATIONS_CONTENT_BUCKET,
  SIGNED_PREVIEW_TTL_SEC,
} from "@/lib/operations-center/storage";
import type {
  EmployeeOperationsFeedItem,
  OperationsContentDetail,
  OperationsContentListItem,
  OperationsContentRow,
  OperationsContentType,
  OperationsDashboardStats,
  OperationsPhase1Type,
  OperationsStatus,
} from "@/lib/operations-center/types";
import type { createAdminClient } from "@/lib/supabase/admin";

type Supabase = ReturnType<typeof createAdminClient>;

function todayYmd(): string {
  return malaysiaDateYmd(new Date());
}

function isActiveOnDate(row: { publish_date: string; expiry_date: string | null }, day: string): boolean {
  if (row.publish_date > day) return false;
  if (row.expiry_date && row.expiry_date < day) return false;
  return true;
}

export async function listShopsForCompany(
  supabase: Supabase,
  companyId: string,
): Promise<Array<{ id: string; name: string }>> {
  const { data, error } = await supabase
    .from("shops")
    .select("id, name")
    .eq("company_id", companyId)
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((s) => ({ id: String(s.id), name: String(s.name) }));
}

export async function staffShopIds(
  supabase: Supabase,
  staffId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("staff_shop_assignments")
    .select("shop_id")
    .eq("staff_id", staffId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => String(r.shop_id));
}

async function countEligibleStaff(
  supabase: Supabase,
  companyId: string,
  targetAllShops: boolean,
  shopIds: string[],
): Promise<number> {
  if (targetAllShops) {
    const shops = await listShopsForCompany(supabase, companyId);
    shopIds = shops.map((s) => s.id);
  }
  if (shopIds.length === 0) return 0;

  const { data: assignments, error: assignErr } = await supabase
    .from("staff_shop_assignments")
    .select("staff_id")
    .in("shop_id", shopIds);
  if (assignErr) throw new Error(assignErr.message);

  const staffIds = [...new Set((assignments ?? []).map((r) => String(r.staff_id)))];
  if (staffIds.length === 0) return 0;

  const { data: staffRows, error: staffErr } = await supabase
    .from("staff")
    .select("id")
    .eq("company_id", companyId)
    .eq("status", "active")
    .in("id", staffIds);
  if (staffErr) throw new Error(staffErr.message);
  return (staffRows ?? []).length;
}

async function loadContentShopMap(
  supabase: Supabase,
  contentIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (contentIds.length === 0) return map;

  const { data, error } = await supabase
    .from("operations_content_shops")
    .select("content_id, shop_id")
    .in("content_id", contentIds);
  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    const cid = String(row.content_id);
    const list = map.get(cid) ?? [];
    list.push(String(row.shop_id));
    map.set(cid, list);
  }
  return map;
}

async function loadAckCounts(
  supabase: Supabase,
  contentIds: string[],
): Promise<Map<string, { read: number; acknowledged: number }>> {
  const map = new Map<string, { read: number; acknowledged: number }>();
  if (contentIds.length === 0) return map;

  const { data, error } = await supabase
    .from("operations_acknowledgements")
    .select("content_id, first_viewed_at, acknowledged_at")
    .in("content_id", contentIds);
  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    const cid = String(row.content_id);
    const cur = map.get(cid) ?? { read: 0, acknowledged: 0 };
    if (row.first_viewed_at) cur.read += 1;
    if (row.acknowledged_at) cur.acknowledged += 1;
    map.set(cid, cur);
  }
  return map;
}

async function loadAttachmentCounts(
  supabase: Supabase,
  contentIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (contentIds.length === 0) return map;

  const { data, error } = await supabase
    .from("operations_attachments")
    .select("content_id")
    .in("content_id", contentIds);
  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    const cid = String(row.content_id);
    map.set(cid, (map.get(cid) ?? 0) + 1);
  }
  return map;
}

async function signedPreviewUrl(
  supabase: Supabase,
  storagePath: string,
  mimeType: string,
): Promise<string | null> {
  if (!isPreviewableMime(mimeType)) return null;
  const { data, error } = await supabase.storage
    .from(OPERATIONS_CONTENT_BUCKET)
    .createSignedUrl(storagePath, SIGNED_PREVIEW_TTL_SEC);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

function mapContentRow(row: Record<string, unknown>): OperationsContentRow {
  return {
    id: String(row.id),
    company_id: String(row.company_id),
    title: String(row.title),
    description: String(row.description ?? ""),
    content_type: String(row.content_type) as OperationsContentType,
    target_all_shops: Boolean(row.target_all_shops),
    require_acknowledgement: Boolean(row.require_acknowledgement),
    publish_date: String(row.publish_date),
    expiry_date: row.expiry_date != null ? String(row.expiry_date) : null,
    status: String(row.status) as OperationsStatus,
    created_by: String(row.created_by ?? ""),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export type ListOperationsFilters = {
  shop_id?: string;
  content_type?: OperationsContentType;
  status?: OperationsStatus;
};

export async function listOperationsContent(
  supabase: Supabase,
  companyId: string,
  filters: ListOperationsFilters = {},
): Promise<OperationsContentListItem[]> {
  let query = supabase
    .from("operations_content")
    .select("*")
    .eq("company_id", companyId)
    .order("publish_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.content_type) query = query.eq("content_type", filters.content_type);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let rows = (data ?? []).map(mapContentRow);
  const contentIds = rows.map((r) => r.id);

  const [shopMap, ackMap, attachMap, shops] = await Promise.all([
    loadContentShopMap(supabase, contentIds),
    loadAckCounts(supabase, contentIds),
    loadAttachmentCounts(supabase, contentIds),
    listShopsForCompany(supabase, companyId),
  ]);
  const shopNameById = new Map(shops.map((s) => [s.id, s.name]));

  if (filters.shop_id) {
    rows = rows.filter((row) => {
      if (row.target_all_shops) return true;
      return (shopMap.get(row.id) ?? []).includes(filters.shop_id!);
    });
  }

  const items: OperationsContentListItem[] = [];
  for (const row of rows) {
    const shopIds = row.target_all_shops ? shops.map((s) => s.id) : (shopMap.get(row.id) ?? []);
    const ack = ackMap.get(row.id) ?? { read: 0, acknowledged: 0 };
    const eligible = await countEligibleStaff(supabase, companyId, row.target_all_shops, shopIds);
    items.push({
      ...row,
      shop_ids: shopIds,
      shop_names: shopIds.map((id) => shopNameById.get(id) ?? id),
      attachment_count: attachMap.get(row.id) ?? 0,
      read_count: ack.read,
      acknowledged_count: ack.acknowledged,
      eligible_staff_count: eligible,
    });
  }
  return items;
}

export async function getOperationsContentDetail(
  supabase: Supabase,
  companyId: string,
  contentId: string,
): Promise<OperationsContentDetail | null> {
  const { data, error } = await supabase
    .from("operations_content")
    .select("*")
    .eq("id", contentId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = mapContentRow(data);
  const shops = await listShopsForCompany(supabase, companyId);
  const shopMap = await loadContentShopMap(supabase, [contentId]);
  const shopIds = row.target_all_shops ? shops.map((s) => s.id) : (shopMap.get(contentId) ?? []);
  const shopNameById = new Map(shops.map((s) => [s.id, s.name]));

  const { data: attachments, error: attErr } = await supabase
    .from("operations_attachments")
    .select("*")
    .eq("content_id", contentId)
    .order("sort_order")
    .order("created_at");
  if (attErr) throw new Error(attErr.message);

  const enriched = await Promise.all(
    (attachments ?? []).map(async (a) => ({
      id: String(a.id),
      content_id: String(a.content_id),
      file_name: String(a.file_name),
      mime_type: String(a.mime_type),
      storage_path: String(a.storage_path),
      file_size: Number(a.file_size ?? 0),
      sort_order: Number(a.sort_order ?? 0),
      created_at: String(a.created_at),
      preview_url: await signedPreviewUrl(supabase, String(a.storage_path), String(a.mime_type)),
    })),
  );

  const ackMap = await loadAckCounts(supabase, [contentId]);
  const ack = ackMap.get(contentId) ?? { read: 0, acknowledged: 0 };
  const eligible = await countEligibleStaff(supabase, companyId, row.target_all_shops, shopIds);

  return {
    ...row,
    shop_ids: shopIds,
    shop_names: shopIds.map((id) => shopNameById.get(id) ?? id),
    attachments: enriched,
    read_count: ack.read,
    acknowledged_count: ack.acknowledged,
    eligible_staff_count: eligible,
  };
}

export type CreateOperationsContentInput = {
  title: string;
  description?: string;
  content_type: OperationsPhase1Type;
  target_all_shops: boolean;
  shop_ids: string[];
  require_acknowledgement: boolean;
  publish_date: string;
  expiry_date?: string | null;
  status: OperationsStatus;
  created_by: string;
};

export async function createOperationsContent(
  supabase: Supabase,
  companyId: string,
  input: CreateOperationsContentInput,
): Promise<OperationsContentRow> {
  const { data, error } = await supabase
    .from("operations_content")
    .insert({
      company_id: companyId,
      title: input.title.trim(),
      description: (input.description ?? "").trim(),
      content_type: input.content_type,
      target_all_shops: input.target_all_shops,
      require_acknowledgement: input.require_acknowledgement,
      publish_date: input.publish_date,
      expiry_date: input.expiry_date || null,
      status: input.status,
      created_by: input.created_by,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const row = mapContentRow(data);
  if (!input.target_all_shops && input.shop_ids.length > 0) {
    const { error: shopErr } = await supabase.from("operations_content_shops").insert(
      input.shop_ids.map((shop_id) => ({ content_id: row.id, shop_id })),
    );
    if (shopErr) throw new Error(shopErr.message);
  }
  return row;
}

export type UpdateOperationsContentInput = Partial<
  Omit<CreateOperationsContentInput, "created_by">
> & {
  shop_ids?: string[];
};

export async function updateOperationsContent(
  supabase: Supabase,
  companyId: string,
  contentId: string,
  input: UpdateOperationsContentInput,
): Promise<OperationsContentRow | null> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title != null) patch.title = input.title.trim();
  if (input.description != null) patch.description = input.description.trim();
  if (input.content_type != null) patch.content_type = input.content_type;
  if (input.target_all_shops != null) patch.target_all_shops = input.target_all_shops;
  if (input.require_acknowledgement != null) patch.require_acknowledgement = input.require_acknowledgement;
  if (input.publish_date != null) patch.publish_date = input.publish_date;
  if (input.expiry_date !== undefined) patch.expiry_date = input.expiry_date || null;
  if (input.status != null) patch.status = input.status;

  const { data, error } = await supabase
    .from("operations_content")
    .update(patch)
    .eq("id", contentId)
    .eq("company_id", companyId)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  if (input.shop_ids != null || input.target_all_shops != null) {
    await supabase.from("operations_content_shops").delete().eq("content_id", contentId);
    const targetAll = input.target_all_shops ?? Boolean(data.target_all_shops);
    const shopIds = input.shop_ids ?? [];
    if (!targetAll && shopIds.length > 0) {
      const { error: shopErr } = await supabase.from("operations_content_shops").insert(
        shopIds.map((shop_id) => ({ content_id: contentId, shop_id })),
      );
      if (shopErr) throw new Error(shopErr.message);
    }
  }

  return mapContentRow(data);
}

export async function deleteOperationsContent(
  supabase: Supabase,
  companyId: string,
  contentId: string,
): Promise<boolean> {
  const { data: attachments } = await supabase
    .from("operations_attachments")
    .select("storage_path")
    .eq("content_id", contentId);

  const { error } = await supabase
    .from("operations_content")
    .delete()
    .eq("id", contentId)
    .eq("company_id", companyId);
  if (error) throw new Error(error.message);

  const paths = (attachments ?? []).map((a) => String(a.storage_path)).filter(Boolean);
  if (paths.length > 0) {
    await supabase.storage.from(OPERATIONS_CONTENT_BUCKET).remove(paths);
  }
  return true;
}

export async function uploadOperationsAttachment(
  supabase: Supabase,
  params: {
    companyId: string;
    contentId: string;
    file: File | Blob;
    fileName: string;
    mimeType: string;
  },
): Promise<{ id: string; preview_url: string | null }> {
  const mime = params.mimeType.toLowerCase();
  if (!OPERATIONS_ALLOWED_MIME_TYPES.has(mime)) {
    throw new Error("Unsupported file type.");
  }
  if (params.file.size > OPERATIONS_ATTACHMENT_MAX_BYTES) {
    throw new Error("File too large (max 10MB).");
  }

  const storagePath = buildOperationsAttachmentPath(
    params.companyId,
    params.contentId,
    mime,
    params.fileName,
  );
  const buffer = Buffer.from(await params.file.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from(OPERATIONS_CONTENT_BUCKET)
    .upload(storagePath, buffer, { contentType: mime, upsert: false });
  if (upErr) throw new Error(upErr.message);

  const { data: sortRows } = await supabase
    .from("operations_attachments")
    .select("sort_order")
    .eq("content_id", params.contentId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextSort = sortRows?.[0]?.sort_order != null ? Number(sortRows[0].sort_order) + 1 : 0;

  const { data, error } = await supabase
    .from("operations_attachments")
    .insert({
      content_id: params.contentId,
      file_name: params.fileName,
      mime_type: mime,
      storage_path: storagePath,
      file_size: params.file.size,
      sort_order: nextSort,
    })
    .select("id, storage_path, mime_type")
    .single();
  if (error) throw new Error(error.message);

  const preview_url = await signedPreviewUrl(
    supabase,
    String(data.storage_path),
    String(data.mime_type),
  );
  return { id: String(data.id), preview_url };
}

function contentVisibleToStaffShops(
  row: OperationsContentRow,
  contentShopIds: string[],
  staffShopIdsList: string[],
): boolean {
  if (row.target_all_shops) return staffShopIdsList.length > 0;
  return contentShopIds.some((id) => staffShopIdsList.includes(id));
}

export async function listEmployeeOperationsFeed(
  supabase: Supabase,
  params: { companyId: string; staffId: string; shopId?: string | null },
): Promise<EmployeeOperationsFeedItem[]> {
  const day = todayYmd();
  const assignedShopIds = await staffShopIds(supabase, params.staffId);
  if (assignedShopIds.length === 0) return [];

  const { data, error } = await supabase
    .from("operations_content")
    .select("*")
    .eq("company_id", params.companyId)
    .eq("status", "published")
    .lte("publish_date", day)
    .or(`expiry_date.is.null,expiry_date.gte.${day}`)
    .order("publish_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const rows = (data ?? []).map(mapContentRow);
  const contentIds = rows.map((r) => r.id);
  const [shopMap, attachRows, ackRows] = await Promise.all([
    loadContentShopMap(supabase, contentIds),
    supabase
      .from("operations_attachments")
      .select("id, content_id, mime_type, storage_path, sort_order")
      .in("content_id", contentIds)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("operations_acknowledgements")
      .select("content_id, first_viewed_at, acknowledged_at")
      .eq("staff_id", params.staffId)
      .in("content_id", contentIds),
  ]);
  if (attachRows.error) throw new Error(attachRows.error.message);
  if (ackRows.error) throw new Error(ackRows.error.message);

  const ackByContent = new Map(
    (ackRows.data ?? []).map((a) => [String(a.content_id), a]),
  );
  const firstAttachByContent = new Map<string, (typeof attachRows.data)[number]>();
  for (const a of attachRows.data ?? []) {
    const cid = String(a.content_id);
    if (!firstAttachByContent.has(cid)) firstAttachByContent.set(cid, a);
  }

  const feed: EmployeeOperationsFeedItem[] = [];
  for (const row of rows) {
    const contentShops = shopMap.get(row.id) ?? [];
    if (!contentVisibleToStaffShops(row, contentShops, assignedShopIds)) continue;
    if (params.shopId && !row.target_all_shops && !contentShops.includes(params.shopId)) {
      if (!assignedShopIds.includes(params.shopId)) continue;
    }

    const ack = ackByContent.get(row.id);
    const firstAttach = firstAttachByContent.get(row.id);
    let preview_attachment: EmployeeOperationsFeedItem["preview_attachment"] = null;
    if (firstAttach) {
      preview_attachment = {
        id: String(firstAttach.id),
        mime_type: String(firstAttach.mime_type),
        preview_url: await signedPreviewUrl(
          supabase,
          String(firstAttach.storage_path),
          String(firstAttach.mime_type),
        ),
      };
    }

    const attachCount = (attachRows.data ?? []).filter((a) => String(a.content_id) === row.id).length;
    feed.push({
      id: row.id,
      title: row.title,
      description: row.description,
      content_type: row.content_type,
      publish_date: row.publish_date,
      expiry_date: row.expiry_date,
      require_acknowledgement: row.require_acknowledgement,
      attachment_count: attachCount,
      is_read: Boolean(ack?.first_viewed_at),
      is_acknowledged: Boolean(ack?.acknowledged_at),
      preview_attachment,
    });
  }
  return feed;
}

export async function getEmployeeOperationsDetail(
  supabase: Supabase,
  params: { companyId: string; staffId: string; contentId: string; shopId: string },
): Promise<(OperationsContentDetail & { is_read: boolean; is_acknowledged: boolean }) | null> {
  const detail = await getOperationsContentDetail(supabase, params.companyId, params.contentId);
  if (!detail || detail.status !== "published" || !isActiveOnDate(detail, todayYmd())) {
    return null;
  }

  const assigned = await staffShopIds(supabase, params.staffId);
  if (!contentVisibleToStaffShops(detail, detail.shop_ids, assigned)) return null;

  const { data: ack } = await supabase
    .from("operations_acknowledgements")
    .select("first_viewed_at, acknowledged_at")
    .eq("content_id", params.contentId)
    .eq("staff_id", params.staffId)
    .maybeSingle();

  return {
    ...detail,
    is_read: Boolean(ack?.first_viewed_at),
    is_acknowledged: Boolean(ack?.acknowledged_at),
  };
}

export async function recordOperationsView(
  supabase: Supabase,
  params: {
    contentId: string;
    staffId: string;
    shopId: string;
    deviceInfo?: string | null;
    requireAcknowledgement: boolean;
  },
): Promise<void> {
  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("operations_acknowledgements")
    .select("id, first_viewed_at, acknowledged_at")
    .eq("content_id", params.contentId)
    .eq("staff_id", params.staffId)
    .maybeSingle();

  if (existing) {
    if (!existing.first_viewed_at) {
      await supabase
        .from("operations_acknowledgements")
        .update({ first_viewed_at: now, device_info: params.deviceInfo ?? null })
        .eq("id", existing.id);
    }
    if (!params.requireAcknowledgement && !existing.acknowledged_at) {
      await supabase
        .from("operations_acknowledgements")
        .update({ acknowledged_at: now })
        .eq("id", existing.id);
    }
    return;
  }

  await supabase.from("operations_acknowledgements").insert({
    content_id: params.contentId,
    staff_id: params.staffId,
    shop_id: params.shopId,
    first_viewed_at: now,
    acknowledged_at: params.requireAcknowledgement ? null : now,
    device_info: params.deviceInfo ?? null,
  });
}

export async function acknowledgeOperationsContent(
  supabase: Supabase,
  params: {
    contentId: string;
    staffId: string;
    shopId: string;
    deviceInfo?: string | null;
  },
): Promise<void> {
  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("operations_acknowledgements")
    .select("id")
    .eq("content_id", params.contentId)
    .eq("staff_id", params.staffId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("operations_acknowledgements")
      .update({
        acknowledged_at: now,
        shop_id: params.shopId,
        device_info: params.deviceInfo ?? null,
      })
      .eq("id", existing.id);
    return;
  }

  await supabase.from("operations_acknowledgements").insert({
    content_id: params.contentId,
    staff_id: params.staffId,
    shop_id: params.shopId,
    first_viewed_at: now,
    acknowledged_at: now,
    device_info: params.deviceInfo ?? null,
  });
}

export async function getOperationsDashboardStats(
  supabase: Supabase,
  companyId: string,
  filters: ListOperationsFilters = {},
): Promise<OperationsDashboardStats> {
  const items = await listOperationsContent(supabase, companyId, {
    ...filters,
    status: filters.status ?? "published",
  });
  const published = items.filter((i) => i.status === "published");

  let totalEligible = 0;
  let totalRead = 0;
  let totalUnread = 0;
  let totalAck = 0;
  let ackEligible = 0;

  for (const item of published) {
    totalEligible += item.eligible_staff_count;
    totalRead += item.read_count;
    totalUnread += Math.max(0, item.eligible_staff_count - item.read_count);
    if (item.require_acknowledgement) {
      ackEligible += item.eligible_staff_count;
      totalAck += item.acknowledged_count;
    }
  }

  const read_rate_pct =
    totalEligible > 0 ? Math.round((totalRead / totalEligible) * 1000) / 10 : 0;
  const acknowledgement_rate_pct =
    ackEligible > 0 ? Math.round((totalAck / ackEligible) * 1000) / 10 : null;

  return {
    total_published: published.length,
    read_rate_pct,
    unread_count: totalUnread,
    acknowledgement_rate_pct,
  };
}

export type EmployeeDashboardOpsSummary = {
  unread_memos: number;
  active_promotions: number;
  announcements: number;
  total_unread: number;
  recent: EmployeeOperationsFeedItem[];
};

export async function getEmployeeDashboardOpsSummary(
  supabase: Supabase,
  params: { companyId: string; staffId: string },
): Promise<EmployeeDashboardOpsSummary> {
  const feed = await listEmployeeOperationsFeed(supabase, params);
  const unread = (item: EmployeeOperationsFeedItem) =>
    item.require_acknowledgement ? !item.is_acknowledged : !item.is_read;

  const unreadMemos = feed.filter((f) => f.content_type === "memo" && unread(f)).length;
  const activePromotions = feed.filter((f) => f.content_type === "promotion").length;
  const announcements = feed.filter((f) => f.content_type === "announcement").length;
  const totalUnread = feed.filter(unread).length;

  return {
    unread_memos: unreadMemos,
    active_promotions: activePromotions,
    announcements,
    total_unread: totalUnread,
    recent: feed.slice(0, 5),
  };
}
