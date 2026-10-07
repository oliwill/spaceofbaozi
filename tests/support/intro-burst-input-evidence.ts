import type { Page, TestInfo } from "@playwright/test";

export async function retainIntroBurstInputs<T>(page: Page, info: Pick<TestInfo, "attach" | "annotations">, run: () => Promise<T>): Promise<T> {
  let result!: T, primary: unknown, failed = false;
  try { result = await run(); }
  catch (error) { primary = error; failed = true; }

  let stage = "read";
  try {
    const inputs = await page.evaluate(() => (window as Window & { __nextScrollInput?: unknown }).__nextScrollInput);
    if (!Array.isArray(inputs)) throw Error("intro burst input records unavailable");
    stage = "attach";
    await info.attach("actual-burst-inputs", { body: Buffer.from(JSON.stringify(inputs, null, 2)), contentType: "application/json" });
  } catch (error) {
    if (!failed) throw error;
    info.annotations.push({ type: "intro-burst-evidence-error", description: `${stage}: ${String(error)}` });
  }
  if (failed) throw primary;
  return result;
}
