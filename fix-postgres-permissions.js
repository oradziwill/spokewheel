require("dotenv").config();
const { Pool } = require("pg");

// Connect as superuser to grant permissions
// Try different common superuser names
const superuserOptions = [
  {
    user: process.env.DB_SUPERUSER || "aleksandraradziwill",
    password: process.env.DB_SUPERUSER_PASSWORD,
  },
  { user: "postgres", password: process.env.DB_SUPERUSER_PASSWORD },
  { user: "aleksandraradziwill" }, // Might work with trust auth
];

async function fixPermissions() {
  console.log("Attempting to fix PostgreSQL permissions...\n");

  for (const creds of superuserOptions) {
    try {
      const superPool = new Pool({
        user: creds.user,
        host: process.env.DB_HOST || "localhost",
        database: "postgres", // Connect to postgres database first
        password: creds.password,
        port: process.env.DB_PORT || 5432,
        ssl:
          process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
      });

      // Test connection
      await superPool.query("SELECT NOW()");
      console.log(`✅ Connected as ${creds.user}`);

      // Grant permissions
      const dbName = process.env.DB_NAME || "spokewheel";
      const dbUser = process.env.DB_USER || "spokewheel_user";

      console.log(
        `\nGranting permissions to ${dbUser} on database ${dbName}...`
      );

      // Connect to the target database
      await superPool.query(`\\c ${dbName}`).catch(() => {
        // If \c doesn't work, reconnect to target database
        superPool.end();
        return new Pool({
          user: creds.user,
          host: process.env.DB_HOST || "localhost",
          database: dbName,
          password: creds.password,
          port: process.env.DB_PORT || 5432,
          ssl:
            process.env.DB_SSL === "true"
              ? { rejectUnauthorized: false }
              : false,
        });
      });

      const targetPool = new Pool({
        user: creds.user,
        host: process.env.DB_HOST || "localhost",
        database: dbName,
        password: creds.password,
        port: process.env.DB_PORT || 5432,
        ssl:
          process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
      });

      // Grant permissions
      await targetPool.query(`GRANT ALL ON SCHEMA public TO ${dbUser}`);
      await targetPool.query(`GRANT CREATE ON SCHEMA public TO ${dbUser}`);
      await targetPool.query(
        `GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${dbUser}`
      );
      await targetPool.query(
        `GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${dbUser}`
      );
      await targetPool.query(
        `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${dbUser}`
      );
      await targetPool.query(
        `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${dbUser}`
      );

      console.log("✅ Permissions granted successfully!");
      console.log(
        "\nYou can now restart your server and it should work with PostgreSQL."
      );

      await superPool.end();
      await targetPool.end();
      process.exit(0);
    } catch (err) {
      if (err.code === "28P01" || err.message.includes("password")) {
        continue; // Try next user
      }
      console.error(`Error with ${creds.user}:`, err.message);
      continue;
    }
  }

  console.log("\n❌ Could not automatically fix permissions.");
  console.log(
    "\nPlease run these commands manually as a PostgreSQL superuser:"
  );
  console.log("\n1. Connect to PostgreSQL:");
  console.log(`   psql -U aleksandraradziwill -d spokewheel`);
  console.log("   (or: psql -U postgres -d spokewheel)");
  console.log("\n2. Run these SQL commands:");
  console.log(
    `   GRANT ALL ON SCHEMA public TO ${
      process.env.DB_USER || "spokewheel_user"
    };`
  );
  console.log(
    `   GRANT CREATE ON SCHEMA public TO ${
      process.env.DB_USER || "spokewheel_user"
    };`
  );
  console.log(
    `   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${
      process.env.DB_USER || "spokewheel_user"
    };`
  );
  console.log(
    `   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${
      process.env.DB_USER || "spokewheel_user"
    };`
  );
  console.log(
    `   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${
      process.env.DB_USER || "spokewheel_user"
    };`
  );
  console.log(
    `   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${
      process.env.DB_USER || "spokewheel_user"
    };`
  );
  process.exit(1);
}

fixPermissions();

