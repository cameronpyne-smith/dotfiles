import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import {
  branchName,
  nextSuffix,
  parseArgs,
  parseTagRefs,
  pickLatestTag,
  tagMessage,
  todayBase,
} from "./hotfix.ts";

describe("pickLatestTag", () => {
  const REAL = [
    "v2025.09.25.3\t\t1758816256",
    "v26.07.16.2\t\t1784557395",
    "v26.07.23.1\t\t1784803033",
    "v26.07.28.0\t1785165818\t",
  ].join("\n");

  test("picks by date, not by version name", () => {
    const refs = parseTagRefs(REAL);
    assert.equal(pickLatestTag(refs), "v26.07.28.0");
    assert.notEqual(pickLatestTag(refs), "v2025.09.25.3");
  });

  test("a version-name sort picks the wrong tag", () => {
    const refs = parseTagRefs(REAL);
    const byVersionField = [...refs].sort(
      (a, b) => Number(b.name.slice(1).split(".")[0]) - Number(a.name.slice(1).split(".")[0]),
    )[0].name;
    assert.equal(byVersionField, "v2025.09.25.3");
    assert.notEqual(byVersionField, pickLatestTag(refs));
  });

  test("prefers the dereferenced commit date for annotated tags", () => {
    const refs = parseTagRefs(["a\t2000\t1000", "b\t\t1500"].join("\n"));
    assert.equal(pickLatestTag(refs), "a");
  });

  test("returns null with no refs", () => {
    assert.equal(pickLatestTag([]), null);
  });
});

describe("parseTagRefs", () => {
  test("skips blank lines and undated refs", () => {
    const refs = parseTagRefs("good\t\t1234\n\nbad\t\t\n   \n");
    assert.deepEqual(refs, [{ name: "good", date: 1234 }]);
  });
});

describe("todayBase", () => {
  test("formats as vYY.MM.DD with padding", () => {
    assert.equal(todayBase(new Date(2026, 6, 29)), "v26.07.29");
    assert.equal(todayBase(new Date(2026, 0, 5)), "v26.01.05");
    assert.equal(todayBase(new Date(2025, 11, 31)), "v25.12.31");
  });
});

describe("nextSuffix", () => {
  test("starts at 0 when nothing exists today", () => {
    assert.equal(nextSuffix("v26.07.29", []), 0);
    assert.equal(nextSuffix("v26.07.29", ["v26.07.28.0", "v26.07.30.1"]), 0);
  });

  test("increments past the highest existing suffix", () => {
    assert.equal(nextSuffix("v26.07.29", ["v26.07.29.0"]), 1);
    assert.equal(nextSuffix("v26.07.29", ["v26.07.29.0", "v26.07.29.1", "v26.07.29.2"]), 3);
    assert.equal(nextSuffix("v26.07.29", ["v26.07.29.2", "v26.07.29.0"]), 3);
  });

  test("ignores non-numeric and nested suffixes", () => {
    assert.equal(nextSuffix("v26.07.29", ["v26.07.29.rc", "v26.07.29.0.1"]), 0);
  });

  test("does not treat the dot as a wildcard", () => {
    assert.equal(nextSuffix("v26.07.29", ["v26X07X29X4"]), 0);
  });

  test("handles double-digit suffixes", () => {
    assert.equal(nextSuffix("v26.07.29", ["v26.07.29.9", "v26.07.29.10"]), 11);
  });
});

describe("branchName", () => {
  test("prefixes the short sha", () => {
    assert.equal(branchName("9ddec5fab"), "prod-hotfix-9ddec5fab");
  });
});

describe("tagMessage", () => {
  test("mirrors the release.yml trailer format", () => {
    const msg = tagMessage({
      tag: "v26.07.29.0",
      requestedBy: "cameron.ps@xml-int.com",
      base: "v26.07.28.0",
      commits: [
        { sha: "9ddec5fab9a4", short: "9ddec5fab", subject: "Fix org switch session (#1641)" },
      ],
    });
    assert.equal(
      msg,
      [
        "Production hotfix v26.07.29.0",
        "Requested-by: cameron.ps@xml-int.com",
        "Correlation-Id: none",
        "Tagged-by: hotfix",
        "Base: v26.07.28.0",
        "Cherry-picked: 9ddec5fab Fix org switch session (#1641)",
      ].join("\n"),
    );
  });

  test("lists every cherry-picked commit", () => {
    const msg = tagMessage({
      tag: "v26.07.29.1",
      requestedBy: "a@b.c",
      base: "v26.07.28.0",
      commits: [
        { sha: "aaa", short: "aaa", subject: "one" },
        { sha: "bbb", short: "bbb", subject: "two" },
      ],
    });
    assert.match(msg, /Cherry-picked: aaa one\nCherry-picked: bbb two$/);
  });
});

describe("parseArgs", () => {
  test("collects commits and flags", () => {
    const o = parseArgs([
      "abc",
      "def",
      "--base",
      "v26.07.28.0",
      "--push-branch",
      "--yes",
      "--dry-run",
    ]);
    assert.deepEqual(o, {
      commits: ["abc", "def"],
      base: "v26.07.28.0",
      pushBranch: true,
      yes: true,
      dryRun: true,
    });
  });

  test("defaults", () => {
    assert.deepEqual(parseArgs(["abc"]), {
      commits: ["abc"],
      base: null,
      pushBranch: false,
      yes: false,
      dryRun: false,
    });
  });

  test("rejects no commits, unknown flags and a bare --base", () => {
    assert.throws(() => parseArgs([]), /no commits given/);
    assert.throws(() => parseArgs(["abc", "--nope"]), /unknown option --nope/);
    assert.throws(() => parseArgs(["abc", "--base"]), /--base needs a tag name/);
  });

  test("--help throws usage", () => {
    assert.throws(() => parseArgs(["--help"]), /Usage: hotfix/);
  });
});
