/**
 * Permanently removes every report flagged isDemo=true (with its samples, kits,
 * consumables and audit entries). Real reports are never touched.
 *
 *   npm run db:remove-demo            → shows what would be removed and asks to confirm
 *   npm run db:remove-demo -- --yes   → removes without prompting
 */
import readline from "node:readline/promises";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const demo = await prisma.report.findMany({ where: { isDemo: true }, select: { id: true, reportNo: true } });
  const real = await prisma.report.count({ where: { isDemo: false } });

  if (demo.length === 0) {
    console.log("No demo reports found. Nothing to remove.");
    return;
  }
  console.log(`Found ${demo.length} demo report(s): ${demo.slice(0, 5).map((r) => r.reportNo).join(", ")}${demo.length > 5 ? ", …" : ""}`);
  console.log(`${real} real report(s) will NOT be touched.`);

  if (!process.argv.includes("--yes")) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question('Type "remove" to permanently delete the demo reports: ');
    rl.close();
    if (answer.trim().toLowerCase() !== "remove") {
      console.log("Cancelled.");
      return;
    }
  }

  const ids = demo.map((r) => r.id);
  await prisma.$transaction(async (tx) => {
    await tx.auditLog.deleteMany({ where: { entityType: "Report", entityId: { in: ids } } });
    await tx.report.deleteMany({ where: { id: { in: ids } } }); // samples/kits/consumables cascade

    // Report numbers: if no real reports exist for a year, restart that year's counter at 0;
    // otherwise keep counting after the highest real number so numbers are never reused.
    const counters = await tx.reportCounter.findMany();
    for (const c of counters) {
      const max = await tx.report.aggregate({ where: { reportYear: c.year }, _max: { reportSeq: true } });
      await tx.reportCounter.update({ where: { year: c.year }, data: { lastSeq: max._max.reportSeq ?? 0 } });
    }
  });
  console.log(`Removed ${ids.length} demo report(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
