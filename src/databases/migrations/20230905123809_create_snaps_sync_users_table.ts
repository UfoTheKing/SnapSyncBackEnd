import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('snaps_sync_users', table => {
    table.charset('utf8mb4');
    table.bigIncrements('id').unsigned().primary();

    table.bigInteger('userId').unsigned().index().references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.bigInteger('snapSyncId').unsigned().index().references('id').inTable('snaps_sync').onDelete('CASCADE').notNullable();
    table.bigInteger('locationId').unsigned().index().references('id').inTable('locations').onDelete('SET NULL').nullable();

    table.string('s3ImageKey').notNullable();
    table.dateTime('snappedAt').notNullable();

    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    table.timestamp('deletedAt').nullable().defaultTo(null);
  });

  await knex.schema.raw(`
  ALTER TABLE snaps_sync_users
  ADD COLUMN unarchived BOOLEAN GENERATED ALWAYS AS (IF(deletedAt IS NULL, 1, NULL)) VIRTUAL
`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('snaps_sync_users');
}
