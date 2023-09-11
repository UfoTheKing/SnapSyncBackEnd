import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('snaps_sync_comments', table => {
    table.charset('utf8mb4');
    table.bigIncrements('id').unsigned().primary();

    table.bigInteger('userId').unsigned().index().references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.bigInteger('snapSyncId').unsigned().index().references('id').inTable('snaps_sync').onDelete('CASCADE').notNullable();
    table.bigInteger('snapSyncParentCommentId').unsigned().index().references('id').inTable('snaps_sync_comments').onDelete('CASCADE').nullable();

    table.string('text', 2200).nullable();

    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    table.timestamp('deletedAt').nullable().defaultTo(null);
  });

  await knex.schema.raw(`
  ALTER TABLE snaps_sync_comments
  ADD COLUMN unarchived BOOLEAN GENERATED ALWAYS AS (IF(deletedAt IS NULL, 1, NULL)) VIRTUAL
`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('snaps_sync_comments');
}
