import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('blocked_users', table => {
    table.charset('utf8mb4');
    table.bigIncrements('id').unsigned().primary();
    table.bigInteger('userId').unsigned().index().references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.bigInteger('blockedUserId').unsigned().index().references('id').inTable('users').onDelete('CASCADE').notNullable();

    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    table.timestamp('deletedAt').nullable().defaultTo(null);
  });

  await knex.schema.raw(`
  ALTER TABLE blocked_users
  ADD COLUMN unarchived BOOLEAN GENERATED ALWAYS AS (IF(deletedAt IS NULL, 1, NULL)) VIRTUAL
`);

  // UNIQUE KEY (userId, blockedUserId, unarchived)
  await knex.schema.raw(`
    CREATE UNIQUE INDEX bu_user_id_blocked_user_id_unarchived_uindex
    ON blocked_users (userId, blockedUserId, unarchived)
    `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('blocked_users');
}