import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', table => {
    table.charset('utf8mb4');

    table.bigIncrements('id').unsigned().primary();
    table.string('username', 30).notNullable();
    table.string('fullName', 100).notNullable();

    table.string('profilePicImageKey', 255).notNullable();

    table.string('phoneNumber', 20).notNullable(); // In formato internazionale, esempio: +393401234567

    table.date('dateOfBirth').notNullable(); // Data di nascita

    table.string('biography', 150).nullable().defaultTo(null);

    table.boolean('isVerified').notNullable().defaultTo(false);
    table.timestamp('verifiedAt').nullable().defaultTo(null);

    table.boolean('isBanned').notNullable().defaultTo(false);
    table.timestamp('bannedAt').nullable().defaultTo(null);
    table.timestamp('bannedUntil').nullable().defaultTo(null);

    table.boolean('isShadowBanned').notNullable().defaultTo(false);
    table.timestamp('shadowBannedAt').nullable().defaultTo(null);
    table.timestamp('shadowBannedUntil').nullable().defaultTo(null);

    table.timestamp('createdAt').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt').notNullable().defaultTo(knex.fn.now());
    table.timestamp('deletedAt').nullable().defaultTo(null);
  });

  await knex.schema.raw(`
    ALTER TABLE users
    ADD COLUMN unarchived BOOLEAN GENERATED ALWAYS AS (IF(deletedAt IS NULL, 1, NULL)) VIRTUAL
  `);

  // UNIQUE KEY (username, unarchived)
  await knex.schema.raw(`
    CREATE UNIQUE INDEX users_username_unarchived_uindex
    ON users (username, unarchived)
  `);

  // UNIQUE KEY (phoneNumber, unarchived)
  await knex.schema.raw(`
    CREATE UNIQUE INDEX users_phone_number_unarchived_uindex
    ON users (phoneNumber, unarchived)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('users');
}
