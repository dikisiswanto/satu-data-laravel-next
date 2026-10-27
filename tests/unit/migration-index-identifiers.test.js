import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("nama indeks migration kompatibel dengan MySQL/MariaDB", () => {
  it("memberi nama eksplisit yang ringkas untuk indeks riwayat validasi", () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        "backend/database/migrations/2026_10_01_000002_create_dataset_workflow_tables.php",
      ),
      "utf8",
    );
    const match = source.match(
      /\$table->index\(\['dataset_id', 'dataset_version', 'created_at'\], '([^']+)'\);/,
    );

    expect(match).not.toBeNull();
    expect(match[1]).toBe("validation_run_ds_ver_created_idx");
    expect(match[1].length).toBeLessThanOrEqual(64);
    expect(source).not.toContain(
      "dataset_validation_runs_dataset_id_dataset_version_created_at_index",
    );
  });
});
