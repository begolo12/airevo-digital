import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hashPassword } from "@/lib/auth/password";
import { getStore } from "@/lib/data/store";
import * as schema from "@/lib/db/schema";

/**
 * Menyalin data contoh dari store lokal ke Postgres.
 *
 * Jalankan setelah `pnpm db:migrate`:
 *   pnpm db:seed
 *
 * Skrip ini idempoten: household dihapus lebih dulu (cascade), lalu dibuat ulang.
 */
async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL belum diisi. Tidak ada yang di-seed.");
    process.exit(1);
  }

  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema });
  const store = getStore();

  console.log("Menghapus household lama…");
  await db.delete(schema.households);

  const [household] = await db
    .insert(schema.households)
    .values({
      name: store.household.name,
      slug: "keluarga-irvan",
      currency: "IDR",
      timezone: store.household.timezone,
    })
    .returning();

  if (!household) throw new Error("Gagal membuat household");

  console.log("Membuat anggota…");
  const memberIdMap = new Map<string, string>();
  for (const member of store.members) {
    const [row] = await db
      .insert(schema.members)
      .values({
        householdId: household.id,
        name: member.name,
        relationship: member.relationship,
        role: member.role,
        birthDate: member.birthDate,
        color: member.color,
        status: member.active ? "active" : "inactive",
      })
      .returning();
    if (row) memberIdMap.set(member.id, row.id);
  }

  console.log("Membuat pengguna…");
  for (const user of store.users) {
    await db.insert(schema.users).values({
      email: user.email,
      name: user.name,
      passwordHash: user.passwordHash || hashPassword("airevo123"),
      memberId: memberIdMap.get(user.memberId) ?? null,
      role: user.role,
    });
  }

  const mapMember = (id?: string) => (id ? memberIdMap.get(id) ?? null : null);

  console.log("Membuat akun…");
  const accountIdMap = new Map<string, string>();
  for (const account of store.accounts) {
    const [row] = await db
      .insert(schema.accounts)
      .values({
        householdId: household.id,
        name: account.name,
        type: account.type,
        ownerMemberId: mapMember(account.ownerMemberId),
        openingBalance: String(account.openingBalance),
        color: account.color,
        isShared: account.isShared,
      })
      .returning();
    if (row) accountIdMap.set(account.id, row.id);
  }

  console.log("Membuat kategori…");
  const categoryIdMap = new Map<string, string>();
  for (const category of store.categories) {
    const [row] = await db
      .insert(schema.categories)
      .values({
        householdId: household.id,
        name: category.name,
        kind: category.kind,
        color: category.color,
      })
      .returning();
    if (row) categoryIdMap.set(category.id, row.id);
  }

  console.log("Membuat transaksi…");
  for (const tx of store.transactions) {
    await db.insert(schema.transactions).values({
      householdId: household.id,
      accountId: accountIdMap.get(tx.accountId)!,
      toAccountId: tx.toAccountId ? accountIdMap.get(tx.toAccountId) : null,
      categoryId: tx.categoryId ? categoryIdMap.get(tx.categoryId) : null,
      type: tx.type,
      amount: String(tx.amount),
      occurredAt: tx.occurredAt,
      description: tx.description,
      memberId: mapMember(tx.memberId),
      visibility: tx.visibility,
      voidedAt: tx.voidedAt ? new Date(tx.voidedAt) : null,
    });
  }

  console.log("Membuat anggaran…");
  for (const budget of store.budgets) {
    await db.insert(schema.budgets).values({
      householdId: household.id,
      categoryId: categoryIdMap.get(budget.categoryId)!,
      month: `${budget.month}-01`,
      amount: String(budget.amount),
    });
  }

  console.log("Membuat tagihan…");
  const billIdMap = new Map<string, string>();
  for (const bill of store.bills) {
    const [row] = await db
      .insert(schema.bills)
      .values({
        householdId: household.id,
        name: bill.name,
        amount: String(bill.amount),
        categoryId: bill.categoryId ? categoryIdMap.get(bill.categoryId) : null,
        accountId: bill.accountId ? accountIdMap.get(bill.accountId) : null,
        frequency: bill.frequency,
        dueDay: bill.dueDay,
        nextDueDate: bill.nextDueDate,
        reminderDaysBefore: bill.reminderDaysBefore,
        status: bill.status,
      })
      .returning();
    if (row) billIdMap.set(bill.id, row.id);
  }

  for (const payment of store.billPayments) {
    const billId = billIdMap.get(payment.billId);
    if (!billId) continue;
    await db.insert(schema.billPayments).values({
      householdId: household.id,
      billId,
      dueDate: payment.dueDate,
      paidAt: new Date(payment.paidAt),
      amount: String(payment.amount),
      status: payment.status,
    });
  }

  console.log("Membuat tujuan…");
  const goalIdMap = new Map<string, string>();
  for (const goal of store.goals) {
    const [row] = await db
      .insert(schema.goals)
      .values({
        householdId: household.id,
        name: goal.name,
        type: goal.type,
        targetAmount: String(goal.targetAmount),
        targetDate: goal.targetDate,
        savedAmount: String(goal.savedAmount),
        accountId: goal.accountId ? accountIdMap.get(goal.accountId) : null,
        memberId: mapMember(goal.memberId),
        visibility: goal.visibility,
        status: goal.status,
      })
      .returning();
    if (row) goalIdMap.set(goal.id, row.id);
  }

  for (const contribution of store.contributions) {
    const goalId = goalIdMap.get(contribution.goalId);
    if (!goalId) continue;
    await db.insert(schema.goalContributions).values({
      householdId: household.id,
      goalId,
      amount: String(contribution.amount),
      contributedAt: contribution.contributedAt,
      note: contribution.note,
    });
  }

  console.log("Membuat utang…");
  for (const debt of store.debts) {
    await db.insert(schema.debts).values({
      householdId: household.id,
      type: debt.type,
      counterparty: debt.counterparty,
      principal: String(debt.principal),
      remaining: String(debt.remaining),
      interestRate: debt.interestRate ? String(debt.interestRate) : null,
      installmentAmount: debt.installmentAmount ? String(debt.installmentAmount) : null,
      dueDate: debt.dueDate,
      status: debt.status,
      notes: debt.notes,
    });
  }

  console.log("Membuat aset…");
  for (const asset of store.assets) {
    await db.insert(schema.assets).values({
      householdId: household.id,
      name: asset.name,
      type: asset.type,
      acquisitionValue: asset.acquisitionValue ? String(asset.acquisitionValue) : null,
      currentValue: String(asset.currentValue),
      acquiredAt: asset.acquiredAt,
      notes: asset.notes,
    });
  }

  console.log("Membuat asuransi…");
  for (const policy of store.insurances) {
    await db.insert(schema.insurances).values({
      householdId: household.id,
      memberId: mapMember(policy.memberId),
      type: policy.type,
      provider: policy.provider,
      policyNumber: policy.policyNumber,
      premium: String(policy.premium),
      period: policy.period,
      nextDueDate: policy.nextDueDate,
      coverage: policy.coverage,
      status: policy.status,
    });
  }

  console.log("Membuat agenda…");
  for (const event of store.events) {
    await db.insert(schema.events).values({
      householdId: household.id,
      title: event.title,
      type: event.type,
      date: event.date,
      time: event.time,
      allDay: event.allDay,
      location: event.location,
      memberId: mapMember(event.memberId),
      recurrence: event.recurrence,
      notes: event.notes,
    });
  }

  console.log("Membuat tugas…");
  for (const chore of store.chores) {
    await db.insert(schema.chores).values({
      householdId: household.id,
      title: chore.title,
      assigneeMemberId: mapMember(chore.assigneeMemberId),
      frequency: chore.frequency,
      dueDate: chore.dueDate,
      status: chore.status,
      points: chore.points,
    });
  }

  console.log("Membuat dokumen…");
  for (const doc of store.documents) {
    await db.insert(schema.documents).values({
      householdId: household.id,
      memberId: mapMember(doc.memberId),
      title: doc.title,
      category: doc.category,
      documentNumber: doc.documentNumber,
      issuer: doc.issuer,
      issuedAt: doc.issuedAt,
      expiresAt: doc.expiresAt,
      fileName: doc.fileName,
      visibility: doc.visibility,
      notes: doc.notes,
    });
  }

  console.log("Membuat catatan kesehatan…");
  for (const record of store.healthRecords) {
    const memberId = memberIdMap.get(record.memberId);
    if (!memberId) continue;
    await db.insert(schema.healthRecords).values({
      householdId: household.id,
      memberId,
      type: record.type,
      title: record.title,
      recordedAt: record.recordedAt,
      nextAt: record.nextAt,
      notes: record.notes,
      visibility: record.visibility,
    });
  }

  console.log("Membuat data pendidikan…");
  for (const record of store.educationRecords) {
    const memberId = memberIdMap.get(record.memberId);
    if (!memberId) continue;
    await db.insert(schema.educationRecords).values({
      householdId: household.id,
      memberId,
      school: record.school,
      level: record.level,
      academicYear: record.academicYear,
      annualCost: record.annualCost ? String(record.annualCost) : null,
      goalId: record.goalId ? goalIdMap.get(record.goalId) ?? null : null,
      notes: record.notes,
    });
  }

  console.log("Membuat daftar belanja…");
  for (const item of store.shopping) {
    await db.insert(schema.shoppingItems).values({
      householdId: household.id,
      name: item.name,
      qty: item.qty,
      unit: item.unit,
      estimatedPrice: String(item.estimatedPrice),
      actualPrice: item.actualPrice !== undefined ? String(item.actualPrice) : null,
      checked: item.checked,
      categoryId: item.categoryId ? categoryIdMap.get(item.categoryId) : null,
    });
  }

  console.log("\n✓ Seed selesai.");
  console.log(`  Household : ${household.name}`);
  console.log(`  Anggota   : ${memberIdMap.size}`);
  console.log(`  Transaksi : ${store.transactions.length}`);
  console.log(`  Akun      : ${accountIdMap.size}`);

  await client.end();
}

main().catch((error) => {
  console.error("Seed gagal:", error);
  process.exit(1);
});
