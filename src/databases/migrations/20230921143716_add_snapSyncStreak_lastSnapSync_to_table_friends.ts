import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('friends', table => {
    table.integer('snapSyncStreak').defaultTo(0).after('rejectedAt');
    table.timestamp('lastSnapSync').nullable().after('snapSyncStreak');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('friends', table => {
    table.dropColumn('snapSyncStreak');
    table.dropColumn('lastSnapSync');
  });
}
