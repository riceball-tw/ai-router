import { expect, test } from "vite-plus/test";
import { NO_DIRECTION, NO_SORT, parseSortQuery, toSortQuery } from "./sort-query";

const VANS = { risk_score: "cvss", affected_hosts: "affected" };

test("maps a concept onto the page's column key", () => {
  expect(toSortQuery(VANS, "risk_score", "desc")).toEqual({ sort: "cvss", dir: "desc" });
});

test("falls back to the field's natural direction", () => {
  expect(toSortQuery(VANS, "risk_score", NO_DIRECTION)).toEqual({ sort: "cvss", dir: "desc" });
  expect(toSortQuery({ name: "cveId" }, "name", NO_DIRECTION)).toEqual({
    sort: "cveId",
    dir: "asc",
  });
});

test("drops a concept the page has no column for", () => {
  expect(toSortQuery(VANS, "compliance_rate", "desc")).toEqual({});
  expect(toSortQuery(VANS, NO_SORT, "desc")).toEqual({});
});

test("ignores a column key this page does not have", () => {
  expect(parseSortQuery({ sort: "cvss", dir: "desc" }, ["cvss"])).toEqual({
    sort: "cvss",
    desc: true,
  });
  expect(parseSortQuery({ sort: "nope", dir: "desc" }, ["cvss"])).toEqual({
    sort: null,
    desc: false,
  });
});
