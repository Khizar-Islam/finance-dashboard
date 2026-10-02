require("dotenv").config();
const { PrismaClient } = require("../generated/prisma");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const USER_ID = "0cd978a4-a623-48ed-870d-9830211754ce";

const categoryDefs = [
  { name: "Food", color: "#A6402E" },
  { name: "Bills", color: "#4F7A5B" },
  { name: "Transport", color: "#D9A441" },
  { name: "Shopping", color: "#8B6F3D" },
  { name: "Entertainment", color: "#3D6B66" },
  { name: "Health", color: "#C97B5F" },
];

function randomDateInMonth(monthsAgo) {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  date.setDate(1 + Math.floor(Math.random() * 27));
  return date;
}

async function main() {
  console.log("Clearing old seeded transactions...");
  await prisma.transaction.deleteMany({ where: { userId: USER_ID } });

  console.log("Seeding categories...");
  const categories = [];
  for (const def of categoryDefs) {
    const cat = await prisma.category.upsert({
      where: { name: def.name },
      update: {},
      create: def,
    });
    categories.push(cat);
  }

  console.log("Seeding transactions...");
  const merchants = {
    Food: ["Al-Fatah", "KFC", "McDonald's", "Cheezious"],
    Bills: ["K-Electric", "PTCL", "SSGC Gas"],
    Transport: ["Careem", "Petrol Pump", "InDrive"],
    Shopping: ["Daraz", "Khaadi", "Bata"],
    Entertainment: ["Netflix", "Cinepax", "Spotify"],
    Health: ["Pharmacy", "Clinic Visit"],
  };

  const incomeMerchants = ["Freelance payout", "Salary", "Refund"];

  const transactions = [];
  for (let monthsAgo = 0; monthsAgo < 6; monthsAgo++) {
    // Expenses
    const txCount = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < txCount; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const merchantList = merchants[category.name];
      const merchant = merchantList[Math.floor(Math.random() * merchantList.length)];
      const amount = Math.floor(200 + Math.random() * 5000);

      transactions.push({
        userId: USER_ID,
        categoryId: category.id,
        amount,
        type: "expense",
        description: `${category.name} expense`,
        merchant,
        transactionDate: randomDateInMonth(monthsAgo),
        source: "manual",
      });
    }

    // One income entry per month
    const incomeMerchant = incomeMerchants[Math.floor(Math.random() * incomeMerchants.length)];
    transactions.push({
      userId: USER_ID,
      categoryId: null,
      amount: Math.floor(10000 + Math.random() * 20000),
      type: "income",
      description: "Income",
      merchant: incomeMerchant,
      transactionDate: randomDateInMonth(monthsAgo),
      source: "manual",
    });
  }

  await prisma.transaction.createMany({ data: transactions });
  console.log(`Created ${transactions.length} transactions across 6 months.`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());