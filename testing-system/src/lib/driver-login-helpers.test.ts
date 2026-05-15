import assert from "node:assert/strict";
import test from "node:test";
import { computeDriverLoginDefaults } from "./driver-login-helpers";
import type { DriverRow } from "@/types/delivery";

function row(partial: Partial<DriverRow> & Pick<DriverRow, "id" | "username" | "password">): DriverRow {
  return {
    companyId: "c1",
    name: "N",
    phone: "-",
    vehicle: "V",
    zone: "Z",
    shiftStart: "08:00",
    shiftEnd: "17:00",
    createdAt: "t",
    isActive: true,
    ...partial,
  };
}

test("empty field seeds first active driver", () => {
  const pool = [
    row({ id: "1", username: "ali", password: "p1" }),
    row({ id: "2", username: "mei", password: "p2" }),
  ];
  assert.deepEqual(computeDriverLoginDefaults("", pool), { username: "ali", password: "p1" });
});

test("match is case-insensitive and returns canonical username from store", () => {
  const pool = [row({ id: "1", username: "newali", password: "secret" })];
  assert.deepEqual(computeDriverLoginDefaults("NEWALI", pool), { username: "newali", password: "secret" });
});

test("partial username does not match — clear so user can finish typing (effect must not run on each key)", () => {
  const pool = [row({ id: "1", username: "newali", password: "secret" })];
  assert.deepEqual(computeDriverLoginDefaults("new", pool), { username: "", password: "" });
});

test("unknown username clears credentials", () => {
  const pool = [row({ id: "1", username: "ali", password: "p1" })];
  assert.deepEqual(computeDriverLoginDefaults("gone", pool), { username: "", password: "" });
});

test("inactive drivers are skipped when any active exists", () => {
  const pool = [
    row({ id: "1", username: "old", password: "x", isActive: false }),
    row({ id: "2", username: "active", password: "y", isActive: true }),
  ];
  assert.deepEqual(computeDriverLoginDefaults("", pool), { username: "active", password: "y" });
});
