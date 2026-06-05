import { permissionsEn } from "./permissions-en";

export const permissionsMs = {
  ...permissionsEn,
  title: "Kebenaran operasi",
  notice: "Admin syarikat boleh menyesuaikan kebenaran selepas menggunakan templat peranan.",
  loading: "Memuatkan kebenaran…",
  saving: "Menyimpan…",
  save: "Simpan kebenaran",
  roleTemplate: "Templat peranan",
  shopScope: "Skop akses kedai",
  selectedShops: "Kedai dipilih",
  applyTemplate: "Guna templat peranan",
  denied: "Anda tiada kebenaran untuk tindakan ini.",
  roles: {
    area_manager: "Pengurus Kawasan",
    store_manager: "Pengurus Kedai",
    supervisor: "Penyelia",
    staff: "Kakitangan",
  },
  scopes: {
    all_shops: "Semua kedai",
    selected_shops: "Kedai terpilih sahaja",
    assigned_only: "Kedai ditugaskan sahaja",
  },
  groups: {
    shop: "Akses kedai",
    staff: "Pengurusan kakitangan",
    attendance: "Kehadiran",
    schedule: "Jadual",
    tasks: "Operasi tugasan",
    reports: "Papan pemuka / laporan",
    admin: "Admin / bil",
  },
};
