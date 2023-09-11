import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('snaps_sync_comments', table => {
    table.datetime('createdAtUtc').notNullable().after('text');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('snaps_sync_comments', table => {
    table.dropColumn('createdAtUtc');
  });
}
