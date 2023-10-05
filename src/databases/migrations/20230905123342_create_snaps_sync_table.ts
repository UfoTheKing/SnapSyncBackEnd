import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('snaps_sync', table => {
    table.charset('utf8mb4');
    table.bigIncrements('id').unsigned().primary();

    table.bigInteger('userId').unsigned().index().references('id').inTable('users').onDelete('CASCADE').notNullable();

    table.string('instanceKey', 64).notNullable().comment('Key SHA256');

    table.boolean('timerStarted').defaultTo(false);
    table.integer('timerSeconds').defaultTo(10);
    table.timestamp('timerStartAt').nullable();

    table.boolean('timerPublishStarted').defaultTo(false);
    table.integer('timerPublishSeconds').defaultTo(20);
    table.timestamp('timerPublishStartAt').nullable();

    table.boolean('isPublished').defaultTo(false); // Indica se è stato pubblicato

    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    table.timestamp('deletedAt').nullable().defaultTo(null);
  });

  await knex.schema.raw(`
  ALTER TABLE snaps_sync
  ADD COLUMN unarchived BOOLEAN GENERATED ALWAYS AS (IF(deletedAt IS NULL, 1, NULL)) VIRTUAL
`);

  // UNIQUE KEY (instanceKey, unarchived)
  await knex.schema.raw(`
  CREATE UNIQUE INDEX si_instanceKey_unarchived_uindex
  ON snaps_sync (instanceKey, unarchived)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('snaps_sync');
}
