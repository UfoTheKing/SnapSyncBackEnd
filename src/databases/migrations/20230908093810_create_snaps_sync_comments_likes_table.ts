import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('snaps_sync_comments_likes', table => {
    table.charset('utf8mb4');
    table.bigIncrements('id').unsigned().primary();

    table.bigInteger('userId').unsigned().index().references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.bigInteger('snapSyncCommentId').unsigned().index().references('id').inTable('snaps_sync_comments').onDelete('CASCADE').notNullable();

    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    table.timestamp('deletedAt').nullable().defaultTo(null);
  });

  await knex.schema.raw(`
  ALTER TABLE snaps_sync_comments_likes
  ADD COLUMN unarchived BOOLEAN GENERATED ALWAYS AS (IF(deletedAt IS NULL, 1, NULL)) VIRTUAL
`);

  // UNIQUE KEY (userId, snapSyncCommentId, unarchived)
  await knex.schema.raw(`
    CREATE UNIQUE INDEX sscl_userId_snapSyncCommentId_unarchived_uindex    
    ON snaps_sync_comments_likes (userId, snapSyncCommentId, unarchived);
    `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('snaps_sync_comments_likes');
}
