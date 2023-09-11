import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('snaps_shapes_positions', table => {
    table.integer('width').unsigned().notNullable().defaultTo(0).after('ownerPosition');
    table.integer('height').unsigned().notNullable().defaultTo(0).after('width');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('snaps_shapes_positions', table => {
    table.dropColumn('width');
    table.dropColumn('height');
  });
}
