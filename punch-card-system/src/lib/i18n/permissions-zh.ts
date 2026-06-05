import { permissionsEn } from "./permissions-en";

export const permissionsZh = {
  ...permissionsEn,
  title: "运营权限",
  notice: "应用角色模板后，公司管理员可继续自定义权限。",
  loading: "加载权限中…",
  saving: "保存中…",
  save: "保存权限",
  roleTemplate: "角色模板",
  shopScope: "门店访问范围",
  selectedShops: "已选门店",
  applyTemplate: "应用角色模板",
  denied: "您没有执行此操作的权限。",
  roles: {
    area_manager: "区域经理",
    store_manager: "店长",
    supervisor: "主管",
    staff: "员工",
  },
  scopes: {
    all_shops: "全部门店",
    selected_shops: "仅选定门店",
    assigned_only: "仅所属门店",
  },
  groups: {
    shop: "门店访问",
    staff: "员工管理",
    attendance: "考勤",
    schedule: "排班",
    tasks: "任务运营",
    reports: "仪表盘 / 报表",
    admin: "管理 / 账单",
  },
};
